import { describe } from 'vitest';
import {
  expectAllowed,
  expectRefused,
  runnableFor,
} from '../_support/role-spec';

/**
 * Feature Organization Creator
 *
 * OWNS: Creates organizations.
 *
 * MUST NOT: Deleting organizations (that is Platform Support); every other
 * administrative capability.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "FEATURE_ORGANIZATION_CREATOR".
 */
const ROLE = 'FEATURE_ORGANIZATION_CREATOR';
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
