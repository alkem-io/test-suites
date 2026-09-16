import { execFileSync } from 'node:child_process';

/**
 * workspace#027-platform-role-redesign — READ-ONLY Postgres access to
 * `platform_audit_entry`, for the handover's group C (the audit RECORD, not
 * just the audit-worthy event).
 *
 * Group C is the one group this repo could not assert at all: there is no
 * GraphQL surface that returns a role-assignment audit row, so
 * `audit-coverage.it-spec.ts` and `flows/rejection-audited.it-spec.ts` both
 * document the gap in their headers rather than covering it. This helper is
 * the missing read path.
 *
 * It shells out through `docker exec … psql` rather than adding the `pg`
 * package: no new npm dependency is permitted, and the container name is the
 * same one the reference driver (`specs/027-platform-role-redesign/role_drive.py`)
 * uses. Verified working 2026-08-05. Everything here is a SELECT — nothing in
 * this module writes.
 *
 * TRAPS — each of these has already produced a wrong test or a wasted hour:
 *
 *  * The migrations table is migrations_typeorm, NOT migrations. FROM
 *    migrations errors with "relation does not exist" and reads like a
 *    missing migration.
 *  * camelCase columns MUST be double-quoted in SQL: "initiatorRole",
 *    "subjectUserId", "subjectOrganizationId", "initiatorUserId",
 *    "createdDate", "rowId", "failureReason", "correlationId". category,
 *    outcome, details are lowercase.
 *  * category, outcome and initiatorRole are Postgres USER-DEFINED enums — a
 *    typo'd literal in a WHERE clause raises an enum error rather than
 *    returning zero rows.
 *  * An organization-target row writes "subjectOrganizationId" and leaves
 *    "subjectUserId" NULL (verified live). A query filtering "subjectUserId"
 *    IS NOT NULL silently drops every organization case.
 */

/** One row of `platform_audit_entry`, as the assertions below need it. */
export type AuditRow = {
  category: string;
  initiatorRole: string;
  outcome: string;
  subjectUserId: string | null;
  subjectOrganizationId: string | null;
  initiatorUserId: string | null;
  details: Record<string, unknown> | null;
};

const CONTAINER = 'alkemio_dev_postgres';

/**
 * Tuples-only (`-t`), unaligned (`-A`), field separator `|` (`-F|`) — ONE
 * argv token, exactly as verified. Split into `-t -A -F '|'` it still works,
 * but the single token is what was measured, so it is what is used.
 */
const PSQL_ARGS = ['-U', 'synapse', '-d', 'alkemio', '-tAF|'];

/** The six columns + `details`, in the order {@link parseAuditRows} expects. */
const AUDIT_COLUMNS =
  'category,"initiatorRole",outcome,"subjectUserId","subjectOrganizationId","initiatorUserId",details';

/** Anything that is not a plain UUID never reaches the interpolated SQL. */
const UUID_SHAPE = /^[0-9a-f-]{36}$/i;

const psql = (sql: string): string =>
  execFileSync('docker', ['exec', CONTAINER, 'psql', ...PSQL_ARGS, '-c', sql], {
    encoding: 'utf8',
  });

const lines = (raw: string): string[] =>
  raw.split('\n').filter(line => line.trim().length > 0);

const nullable = (field: string): string | null =>
  field === '' ? null : field;

/**
 * `details` is jsonb and can contain a `|` (the rejection rows carry a full
 * error message). Fields 0-5 are fixed-shape ids/enums that never contain the
 * separator, so everything from index 6 onward is rejoined before parsing —
 * otherwise a piped message silently truncates the JSON and `JSON.parse`
 * throws on a row that is perfectly well-formed in the database.
 */
const parseAuditRows = (raw: string): AuditRow[] =>
  lines(raw).map(line => {
    const fields = line.split('|');
    const details = fields.slice(6).join('|');

    return {
      category: fields[0],
      initiatorRole: fields[1],
      outcome: fields[2],
      subjectUserId: nullable(fields[3]),
      subjectOrganizationId: nullable(fields[4]),
      initiatorUserId: nullable(fields[5]),
      details:
        details === ''
          ? null
          : (JSON.parse(details) as Record<string, unknown>),
    };
  });

let reachable: boolean | undefined;

/**
 * Memoised — a `docker exec` per assertion would dominate the runtime of any
 * group C spec. `PLATFORM_ROLES_AUDIT_DB=off` forces `false` (the escape hatch
 * for an environment where the container is not reachable, e.g. a remote
 * stack); the DEFAULT is on.
 */
export const auditDbAvailable = (): boolean => {
  if (reachable !== undefined) {
    return reachable;
  }

  if (process.env.PLATFORM_ROLES_AUDIT_DB === 'off') {
    reachable = false;
    return reachable;
  }

  try {
    psql('SELECT 1');
    reachable = true;
  } catch {
    reachable = false;
  }

  return reachable;
};

/**
 * Loud, single-cause failure. Without it an unreachable container surfaces as
 * every group C assertion failing on a different-looking parse error.
 */
export const assertAuditDbReachable = (): void => {
  if (!auditDbAvailable()) {
    throw new Error(
      'audit-db: cannot reach alkemio_dev_postgres — group C assertions cannot run'
    );
  }
};

/** Row count of `platform_audit_entry` — C1's before/after delta. */
export const auditCount = (): number =>
  Number(psql('SELECT count(*) FROM platform_audit_entry').trim());

/**
 * The most recent `n` rows. Ordered by "createdDate" DESC then "rowId" DESC:
 * a grant and its audit row can share a timestamp to the millisecond, and
 * "rowId" is the only total order across a tie.
 */
export const auditTail = (n = 1): AuditRow[] =>
  parseAuditRows(
    psql(
      `SELECT ${AUDIT_COLUMNS} FROM platform_audit_entry ` +
        `ORDER BY "createdDate" DESC, "rowId" DESC LIMIT ${Math.trunc(n)}`
    )
  );

/**
 * Rows whose subject is `subjectId`, whichever column holds it. Both columns
 * are checked deliberately: an organization-target row leaves "subjectUserId"
 * NULL, so a user-only filter drops every group D4 / feature-role-on-an-org
 * case without reporting anything.
 *
 * `subjectId` is interpolated into the SQL, so it is shape-checked first —
 * that check IS the injection guard, not a convenience.
 */
export const auditRowsForSubject = (
  subjectId: string,
  limit = 10
): AuditRow[] => {
  if (!UUID_SHAPE.test(subjectId)) {
    throw new Error(
      `audit-db: refusing to query for a non-UUID subject '${subjectId}'`
    );
  }

  return parseAuditRows(
    psql(
      `SELECT ${AUDIT_COLUMNS} FROM platform_audit_entry ` +
        `WHERE ("subjectUserId" = '${subjectId}' OR "subjectOrganizationId" = '${subjectId}') ` +
        `ORDER BY "createdDate" DESC, "rowId" DESC LIMIT ${Math.trunc(limit)}`
    )
  );
};

/** Applied migration names, oldest first — the P1 precondition's evidence. */
export const appliedMigrations = (): string[] =>
  lines(psql('SELECT name FROM migrations_typeorm ORDER BY timestamp')).map(
    line => line.trim()
  );
