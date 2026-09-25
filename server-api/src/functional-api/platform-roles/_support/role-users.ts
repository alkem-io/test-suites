import {
  BOOTSTRAP_ROLES_ADMIN_EMAIL,
  NEEDS_SERVICE_PROFILE,
  PLATFORM_ROLE_USERS,
  platformRoleEmail,
} from '@alkemio/tests-lib';
import type { PlatformRole } from '../capabilities.data';

/**
 * The 14 single-role users live in the shared `lib`
 * (`scenario/platform-roles/platform-role-users.ts`) so the Playwright suite
 * seeds and uses exactly the same accounts. These are this suite's names for
 * them; `coverage-guard` checks the shared list matches the capability table.
 */
export const ROLE_USER: Record<PlatformRole, string> = PLATFORM_ROLE_USERS;

export const emailOf = (role: PlatformRole): string => platformRoleEmail(role);

export { BOOTSTRAP_ROLES_ADMIN_EMAIL, NEEDS_SERVICE_PROFILE };
