import { TestUser } from '../../common/enums/test.user';
import { RoleName } from '../../core/generated/alkemio-schema';
import { assignPlatformRole } from '../baseFunctions';
import { LogManager } from '../LogManager';
import { TestUserManager } from '../TestUserManager';
import { buildPoolIdentifierEmail } from '../pool-identity';

/**
 * The PLATFORM-level roles each shared-pool identity is expected to hold —
 * the declarative statement of "who holds what", per pool role.
 *
 * This exists because per-worker identity pools broke a silent assumption:
 * `admin@alkem.io`'s `GLOBAL_ADMIN` is granted by the SERVER's own bootstrap
 * (`bootstrap.service.ts` seeds a `global-admin` credential for that one
 * literal address from `users.json`), not by this harness. A per-worker
 * `admin+wN@alkem.io` is therefore just an ordinary REGISTERED user, and
 * every scenario setup that worker runs — which acts as GLOBAL_ADMIN — fails
 * at the first privileged call (verified: `createOrganization` →
 * FORBIDDEN_POLICY). The other three roles were already granted lazily by
 * `TestScenarioFactory.populateGlobalRoles()`; they are folded in here so
 * that "what platform role does pool role X hold" has ONE auditable answer
 * instead of being split between a server bootstrap file and a scenario
 * side effect.
 *
 * Roles NOT listed here hold no platform role at all — verified live against
 * a seeded stack: every other pool identity's `platform.roleSet.myRoles` is
 * exactly `["REGISTERED"]`. Their privileges come from per-scenario space /
 * organization role assignments, which are already made against whichever
 * identity the running worker resolved, and so need no parity work.
 *
 * `REGISTERED` is deliberately absent: it is implicit in having an account,
 * not something that can be granted.
 */
export const POOL_PLATFORM_ROLES: Partial<Record<TestUser, RoleName[]>> = {
  [TestUser.GLOBAL_ADMIN]: [RoleName.GlobalAdmin],
  [TestUser.GLOBAL_LICENSE_ADMIN]: [RoleName.GlobalLicenseManager],
  [TestUser.GLOBAL_SUPPORT_ADMIN]: [RoleName.GlobalSupport],
  [TestUser.GLOBAL_BETA_TESTER]: [RoleName.PlatformBetaTester],
};

/**
 * Grants every pool identity, for every worker slot, the platform roles
 * `POOL_PLATFORM_ROLES` says its role holds — so worker N's `space.admin`,
 * `admin`, etc. carry exactly the same platform-level authority as worker
 * 0's, and every existing assertion keeps proving the same thing.
 *
 * Idempotent and convergent: each identity's already-held roles come from
 * the `RoleNames` just fetched during the mint, and only genuinely missing
 * roles are granted. Re-running against an already-provisioned database is
 * a no-op (beyond the reads), so this is safe on both a freshly recreated
 * DB and a long-lived one.
 *
 * Runs in `globalSetup`, where the current worker index is 0, so the
 * granting actor (`TestUser.GLOBAL_ADMIN` → `admin@alkem.io`) is the
 * bootstrap-seeded real global admin — the only identity that can grant
 * `GLOBAL_ADMIN` in the first place. Must therefore be called AFTER
 * `TestUserManager.populateUserModelMap()` and BEFORE `serialize()`, so the
 * in-memory `RoleNames` this updates are the ones workers hydrate: that is
 * what makes `TestScenarioFactory.populateGlobalRoles()`'s
 * already-has-the-role check see them and skip, removing the per-scenario
 * grant churn on shared identities rather than multiplying it by worker count.
 */
export const provisionPoolPlatformRoles = async (
  workerCount = 1
): Promise<void> => {
  const logger = LogManager.getLogger();
  let granted = 0;

  for (let workerIndex = 0; workerIndex < workerCount; workerIndex++) {
    for (const [poolRole, platformRoles] of Object.entries(
      POOL_PLATFORM_ROLES
    ) as [TestUser, RoleName[]][]) {
      const email = buildPoolIdentifierEmail(poolRole, workerIndex);
      const userModel = TestUserManager.getUserModelByEmail(email);

      if (userModel.id.length === 0) {
        throw new Error(
          `Cannot provision platform roles for '${email}': the user model has no id ` +
            '(the mint did not resolve this identity against the API). ' +
            'Aborting rather than silently leaving a worker slot under-privileged, ' +
            'which would surface later as unexplained authorization failures.'
        );
      }

      for (const platformRole of platformRoles) {
        if (userModel.RoleNames.includes(platformRole)) {
          continue;
        }
        await assignPlatformRole(
          userModel.id,
          platformRole,
          TestUser.GLOBAL_ADMIN
        );
        // Keep the in-memory model in step with what the platform now
        // believes, so the snapshot workers hydrate is accurate and the
        // factory's idempotence check does not re-grant per scenario.
        userModel.RoleNames.push(platformRole);
        granted++;
      }
    }
  }

  // Deliberately console.log, not LogManager (its console transport defaults
  // to error-only in CI): this is per-run evidence of how much platform-role
  // provisioning the pool actually needed, which is the first thing worth
  // seeing if a worker slot ever behaves as under-privileged.
  console.log(
    `[provision] pool platform roles: ${granted} granted across ${workerCount} worker slot(s)`
  );
  logger.info?.(
    `[provision] pool platform roles: ${granted} granted across ${workerCount} worker slot(s)`
  );
};
