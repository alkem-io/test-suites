import { Pool, type QueryResultRow } from 'pg';
import { testConfiguration } from '../config/test.configuration';
import { assertLoopbackInternal } from '../config/loopback-guard';
import { LogManager } from "../scenario/LogManager";

/**
 * Direct Postgres access to the compose `alkemio` database, for assertions
 * and seeds that have no GraphQL surface — e.g. reading `platform_audit_entry`
 * rows (054-delete-own-account contracts/audit-account-deletion.md §2/§3) or
 * seeding `account."externalSubscriptionID"` (quickstart.md §4 — no mutation
 * exists for it; it is service-internal to the Wingback license flow).
 *
 * Column identifiers on `platform_audit_entry` are the raw camelCase names
 * TypeORM created them with (see `server/src/migrations/1779195577000-CreatePlatformAuditEntry.ts`)
 * and MUST be double-quoted in raw SQL (`"subjectUserId"`, `"initiatorRole"`,
 * `"createdDate"`, …) — Postgres folds unquoted identifiers to lower case.
 *
 * Never a substitute for a GraphQL/REST assertion where one exists — direct
 * SQL is for the audit trail and the one unexposed seed field only.
 */
let pool: Pool | undefined;

const getHarnessDbPool = (): Pool => {
  if (!pool) {
    const { host, port, database, user, password } = testConfiguration.postgres;
    assertLoopbackInternal('Harness Postgres (POSTGRES_HOST)', { host });
    pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      max: 5,
      connectionTimeoutMillis: 5_000,
    });
    // `pg` emits `error` for failures on idle pooled clients; unhandled, it
    // terminates the worker instead of failing the next query.
    pool.on('error', error => {
      LogManager.getLogger().error(
        `[harness-db] idle client error: ${String(error)}`
      );
    });
  }
  return pool;
};

export const queryHarnessDb = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> => {
  const result = await getHarnessDbPool().query<T>(text, params);
  return result.rows;
};

/** Closes the pooled Postgres connection. Same call-site guidance as
 * `closeHarnessRedis` — optional, since process exit reclaims the socket. */
export const closeHarnessDb = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
};
