import { beforeAll } from 'vitest';
import {
  grantSingleRoleFixtures,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { appliedMigrations, auditDbAvailable } from './helpers/audit-db';
import { reportedForUser } from './helpers/privileges';

/**
 * workspace#027-platform-role-redesign (qual-ts-14, 2026-07-30 fix wave) —
 * project-scoped `setupFiles` entry, wired ONLY into the `platform-roles`
 * and `platform-roles-canonical` vitest projects (`vitest.config.ts`), never
 * the shared root `globalTestsSetup.ts`. Seeding these 13 single-role
 * fixtures is this feature's own concern; running it from the shared
 * root setup meant an unrelated project (e.g. `callouts`, `storage`) could
 * be hard-failed by a fixture this feature owns, and ran ahead of the
 * env-prerequisite gate besides.
 *
 * `beforeAll` here (not a bare top-level call) matches this repo's own
 * `setupTests.ts` convention for `setupFiles`. The module-level `seeded`
 * guard is the actual de-dup mechanism: with `isolate: false` and
 * `fileParallelism: false` (both platform-roles projects), this module
 * loads once per worker and `beforeAll` re-fires per test FILE within that
 * worker — the flag ensures the live seeding call itself runs exactly once.
 *
 * THE PRECONDITIONS LIVE HERE, AND NOWHERE ELSE (handover §1). They are not
 * assertions and must never be written as `it()`s: Vitest's default
 * `BaseSequencer` orders files by size / cached duration, never
 * alphabetically, so a `preconditions.it-spec.ts` would run AFTER most of the
 * cases it exists to diagnose — turning one named, actionable failure into
 * fifty identical-looking ones. Order below is deliberate: P1 (is the schema
 * even there) → seeding → P2 (were the credential RULES written) → P4 (is
 * Slice A still additive).
 */
let seeded = false;

/** P1 — the five migrations this feature ships. */
const REQUIRED_MIGRATIONS: readonly string[] = [
  'AddPlatformRolesRedesign1784999999999',
  'AlterPlatformAuditEntrySubject1785000000001',
  'AddPlatformAuditCategories1785000000002',
  'AddPlatformAuditOutcomes1785000000003',
  'ExtendPlatformAuditInitiatorRole1785000000004',
];

const assertMigrationsApplied = (): void => {
  if (!auditDbAvailable()) {
    // The DB is the only evidence for P1 and it is optional infrastructure
    // (group C skips itself the same way). A warning, not a failure — the
    // alternative is refusing to run the entire suite on a stack where only
    // the container name differs.
    console.warn(
      'platform-roles setup: precondition P1 skipped — alkemio_dev_postgres is not reachable'
    );
    return;
  }

  const applied = new Set(appliedMigrations());
  // NOTE: `AddUserLanguagePreference1785000000000` sits inside this timestamp
  // range and is UNRELATED to this feature. It is not a sixth migration; do
  // not add it here when the list "looks like it is missing one".
  const missing = REQUIRED_MIGRATIONS.filter(name => !applied.has(name));

  if (missing.length > 0) {
    throw new Error(
      `precondition P1: platform-role migrations not applied — missing [${missing.join(', ')}]. ` +
        'Run `pnpm run migration:run` in the server worktree.'
    );
  }
};

const assertPlatformPolicyRecomputed = async (): Promise<void> => {
  const rolesAdmin = await reportedForUser(TestUser.PLATFORM_ROLES_ADMIN);

  if (!rolesAdmin.roleSet.includes('GRANT_GLOBAL_ADMINS')) {
    throw new Error(
      'precondition P2: the platform authorization policy has not been recomputed for this feature. ' +
        'Run the authorizationPolicyResetOnPlatform mutation as GLOBAL_ADMIN — NOT authorizationPolicyResetAll, ' +
        'which publishes to RabbitMQ and is executed by the auth-reset-worker container that must have been ' +
        'built from the branch under test. The migrations create the role rows; only the reset writes the ' +
        'credential RULES onto the stored policies, and without it every grant/privilege case fails identically.'
    );
  }
};

const assertSliceAIsAdditive = async (): Promise<void> => {
  // Measured live 2026-08-05: admin@alkem.io myRoles =
  // [GLOBAL_ADMIN, PLATFORM_ROLES_ADMIN, REGISTERED]. It holds the new role
  // AND the legacy credential — which is exactly why §8 forbids using it as
  // the actor in any denial case, and exactly what makes it the right probe
  // for additivity.
  const legacy = await reportedForUser(TestUser.GLOBAL_ADMIN);

  if (
    !legacy.roleSet.includes('GRANT_GLOBAL_ADMINS') ||
    !legacy.platform.includes('PLATFORM_ADMIN')
  ) {
    throw new Error(
      'precondition P4: the seeded GLOBAL_ADMIN cannot grant platform roles / lost PLATFORM_ADMIN — ' +
        'Slice A must be purely additive.'
    );
  }
};

beforeAll(async () => {
  if (seeded) return;
  seeded = true;
  assertMigrationsApplied();
  await grantSingleRoleFixtures();
  // `graphqlRequestAuth` resolves a TestUser to a token through
  // `TestUserManager`, whose model map is built by `populateUserModelMap()` —
  // and NOTHING in the setup path called it. Files that build a scenario get
  // it for free from `TestScenarioFactory`; the ones that only read
  // privileges (role-privilege-contract) did not, so running such a file on
  // its own crashed in `getUserModelByType` with "Cannot read properties of
  // undefined (reading 'get')" — a message about neither roles nor
  // privileges. Idempotent (guarded by its own `populated` flag) and cached
  // for the whole run, so this costs one mint per user, once.
  await TestUserManager.populateUserModelMap();
  await assertPlatformPolicyRecomputed();
  await assertSliceAIsAdditive();
}, 300_000);
