import { describe } from 'vitest';
import {
  expectAllowed,
  expectRefused,
  runnableFor,
} from '../_support/role-spec';

/**
 * Platform Audit Reader
 *
 * OWNS: Reads the platform audit trail (the only role that may) and every holder
 * list.
 *
 * MUST NOT: EVERY administrative action - it performs none, so it can never
 * review its own work. Mutually exclusive with every other Platform role.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "PLATFORM_AUDIT_READER".
 */
const ROLE = 'PLATFORM_AUDIT_READER';
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
