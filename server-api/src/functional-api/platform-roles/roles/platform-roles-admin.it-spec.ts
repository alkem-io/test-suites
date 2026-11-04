import { describe } from 'vitest';
import {
  expectAllowed,
  expectRefused,
  runnableFor,
} from '../_support/role-spec';

/**
 * Platform Roles Admin
 *
 * OWNS: Role assignment and nothing else: assigns and revokes all 14 roles (sole
 * authority for the Platform ones), reads every holder list, sets the service-
 * profile marker.
 *
 * MUST NOT: Any content, settings, operational or user-record action; reading
 * the audit trail; assigning any role to ITSELF.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "PLATFORM_ROLES_ADMIN".
 */
const ROLE = 'PLATFORM_ROLES_ADMIN';
const { can, cannot } = runnableFor(ROLE);

describe(ROLE, () => {
  // Refused AT THE AUTHORIZATION GATE — a validation error, a not-found or a
  // forbidden sub-field does not count. Negatives run first: they change no
  // state, so a positive can never starve one of its target.
  describe('cannot', () => {
    for (const capability of cannot) expectRefused(ROLE, capability);
  });

  // Allowed, AND the effect each capability declares is read back
  // (`verifies` in the table) — "no error" alone never passes.
  describe('can', () => {
    for (const capability of can) expectAllowed(ROLE, capability);
  });
});
