import { describe } from 'vitest';
import {
  expectAllowed,
  expectRefused,
  runnableFor,
} from '../_support/role-spec';

/**
 * Platform Operations Admin
 *
 * OWNS: Operational machinery: authorization and license resets, search and AI
 * re-ingest, migrations, notification prune, Matrix housekeeping.
 *
 * MUST NOT: Reading user personal data; email change or identity deletion; role
 * assignment; content; settings; space visibility or structure.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "PLATFORM_OPERATIONS_ADMIN".
 */
const ROLE = 'PLATFORM_OPERATIONS_ADMIN';
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
