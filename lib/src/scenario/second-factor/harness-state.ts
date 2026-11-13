import { assertLoopbackInternal } from '../../config/loopback-guard';
import { testConfiguration } from '../../config/test.configuration';
import { queryHarnessDb } from '../../utils/harness-db.client';
import {
  redisDeleteByPrefix,
  redisGet,
  redisValuesByPrefix,
} from '../../utils/harness-redis.client';

/**
 * Loopback Redis and Postgres state the second-factor suites read and set.
 * Every helper goes through the harness clients, which refuse a non-loopback
 * target (`loopback-guard.ts`).
 */

/** kratos-webhooks' `LoginBackoffIPPrefix`: one counter per client address. */
const LOGIN_BACKOFF_IP_PREFIX = 'login_backoff:ip:';

/** The key `CookieSessionStrategy` reads for a subject-wide revocation. */
const SUBJECT_MARKER_PREFIX = 'alkemio:subrevoked:';

/**
 * Clears the login proxy's per-address counters. A successful sign-in no
 * longer clears its address, so without this the suites' own sign-ins (the
 * harness's Kratos logins and the server's non-interactive ones, all from the
 * runner's address) add up to the lockout threshold within one window.
 *
 * It clears every address, and that counter is the only bound on guessing a
 * second-step code. So it refuses unless the runner signs in through a
 * loopback identity host. That check cannot tell a stack of the runner's own
 * from a shared cluster port-forwarded to loopback: the suites are run only
 * against a stack of the runner's own, and that rule is the confinement.
 */
export const clearAddressCounters = (): Promise<number> => {
  assertLoopbackInternal('Clearing every login-proxy address counter (KRATOS_ENDPOINT)', {
    url: testConfiguration.endPoints.kratos.public,
  });
  return redisDeleteByPrefix(LOGIN_BACKOFF_IP_PREFIX);
};

/** The login proxy's per-address counts, one per address key it holds. */
export const addressCounts = async (): Promise<number[]> =>
  (await redisValuesByPrefix(LOGIN_BACKOFF_IP_PREFIX)).map(Number);

/** The subject-revocation marker the server wrote for `sub`, epoch seconds. */
export const readSubjectMarker = async (sub: string): Promise<number> => {
  const raw = await redisGet(SUBJECT_MARKER_PREFIX + sub);
  const value = Number(raw);
  if (raw === null || !Number.isFinite(value)) {
    throw new Error(
      `second-factor: no subject-revocation marker for '${sub}' (read '${raw}')`
    );
  }
  return value;
};

/**
 * Moves an organisation rule's switch-on time `days` into the past — the one
 * write that ages a rule: the server reads the rule on every evaluation, so the
 * very next request sees it. There is deliberately no platform variant.
 */
export const ageRuleSince = async (
  target: { organizationId: string },
  days: number
): Promise<void> => {
  const rows = await queryHarnessDb(
    `UPDATE organization
        SET settings = jsonb_set(
          settings,
          '{security,secondFactorRequiredSince}',
          to_jsonb(to_char((now() - make_interval(days => $2::int)) AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))
      WHERE id = $1 AND settings ? 'security'
      RETURNING id`,
    [target.organizationId, days]
  );
  if (rows.length !== 1) {
    throw new Error(
      `second-factor: organisation ${target.organizationId} has no stored security block to age — switch its rule on first`
    );
  }
};

export type SavedPlatformRule = { security: unknown };

/** The platform's stored `security` block (or its absence), for `restore`. */
export const savePlatformRule = async (): Promise<SavedPlatformRule> => {
  const rows = await queryHarnessDb<{ security: unknown }>(
    `SELECT settings -> 'security' AS security FROM platform`
  );
  if (rows.length !== 1) {
    throw new Error(`second-factor: expected one platform row, read ${rows.length}`);
  }
  return { security: rows[0].security };
};

/** Writes the saved block back by SQL — works when no admin session is left. */
export const restorePlatformRule = async (
  saved: SavedPlatformRule
): Promise<void> => {
  await queryHarnessDb(
    saved.security === null
      ? `UPDATE platform SET settings = settings - 'security'`
      : `UPDATE platform SET settings = jsonb_set(settings, '{security}', $1::jsonb, true)`,
    saved.security === null ? [] : [JSON.stringify(saved.security)]
  );
};

export type AuthenticationAuditRow = {
  outcome: string;
  details: Record<string, unknown> | null;
  correlationId: string | null;
  subjectUserId: string | null;
  subjectOrganizationId: string | null;
  initiatorUserId: string | null;
  initiatorRole: string;
  createdDate: Date;
};

/** `authentication` audit rows about a user or an organisation, oldest first. */
export const authenticationAuditRows = (subject: {
  userId?: string;
  organizationId?: string;
}): Promise<AuthenticationAuditRow[]> =>
  queryHarnessDb<AuthenticationAuditRow>(
    `SELECT outcome, details, "correlationId", "subjectUserId",
            "subjectOrganizationId", "initiatorUserId", "initiatorRole", "createdDate"
       FROM platform_audit_entry
      WHERE category = 'authentication'
        AND ($1::uuid IS NULL OR "subjectUserId" = $1::uuid)
        AND ($2::uuid IS NULL OR "subjectOrganizationId" = $2::uuid)
      ORDER BY "createdDate" ASC`,
    [subject.userId ?? null, subject.organizationId ?? null]
  );

/** How many `platform_configuration` rows record a value naming `security`
 * (compare before and after an action: the runner's clock is not the DB's). */
export const platformConfigurationRowsNamingSecurity = async (): Promise<number> => {
  const rows = await queryHarnessDb<{ count: string }>(
    `SELECT count(*)::text AS count FROM platform_audit_entry
      WHERE category = 'platform_configuration'
        AND row_to_json(platform_audit_entry)::text LIKE '%"security"%'`
  );
  return Number(rows[0]?.count ?? '0');
};
