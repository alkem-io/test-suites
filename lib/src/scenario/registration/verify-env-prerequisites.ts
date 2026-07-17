import { TestUser } from '../../common/enums/test.user';
import { LogManager } from '../LogManager';
import { getUserToken } from './get-user-token';

/**
 * Env-prerequisite verification (test-suites#565, Phase 1).
 *
 * Runs once in global setup, AFTER user registration and BEFORE any scenario.
 * It proves the auth prerequisite is actually met by minting a real token — the
 * one thing that, when silently broken (e.g. a Kratos identity provisioned with
 * a mismatched password), otherwise cascades into every scenario failing 40+
 * minutes in with misleading downstream errors.
 *
 * A CRITICAL user that cannot authenticate aborts the whole run immediately with
 * one clear, prerequisite-scoped message. REPRESENTATIVE users are probed for
 * early signal but are non-fatal (a single role being off shouldn't mask a
 * healthy env).
 */

// Users whose auth failure means the environment is unusable — fail fast.
// Broadened beyond admin (test-suites#569, R4): Phase 2 (#567) provisions every
// TestUser deterministically via the Kratos admin API, so a representative
// spread across privilege levels is expected to authenticate; if any of these
// can't, the env is broken and every scenario would cascade — abort now.
const CRITICAL_USERS: TestUser[] = [
  TestUser.GLOBAL_ADMIN,
  TestUser.SPACE_ADMIN,
  TestUser.SPACE_MEMBER,
  TestUser.NON_SPACE_MEMBER,
];

// Remaining roles probed for early diagnostics only (logged, non-fatal).
const REPRESENTATIVE_USERS: TestUser[] = [
  TestUser.SUBSPACE_ADMIN,
  TestUser.SUBSPACE_MEMBER,
  TestUser.ORGANIZATION_ADMIN,
];

const emailOf = (user: TestUser): string => `${user}@alkem.io`;

export const verifyEnvPrerequisites = async (): Promise<void> => {
  const logger = LogManager.getLogger();

  for (const user of CRITICAL_USERS) {
    const email = emailOf(user);
    try {
      const token = await getUserToken(email);
      if (!token) {
        throw new Error('non-interactive-login returned an empty token');
      }
      logger.info?.(`[env-prereq] auth OK for critical user ${email}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `ENV PREREQUISITE FAILED: critical user '${email}' cannot authenticate — ${detail}. ` +
          'The environment is not ready; aborting before scenarios run to avoid a misleading cascade. ' +
          'Check Kratos user provisioning and AUTH_TEST_HARNESS_PASSWORD (test-suites#565).'
      );
    }
  }

  for (const user of REPRESENTATIVE_USERS) {
    const email = emailOf(user);
    try {
      await getUserToken(email);
      logger.info?.(`[env-prereq] auth OK for ${email}`);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      logger.warn?.(
        `[env-prereq] auth FAILED for representative user ${email} (non-fatal) — ${detail}`
      );
    }
  }
};
