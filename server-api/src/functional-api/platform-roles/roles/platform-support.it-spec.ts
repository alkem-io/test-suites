import { describe } from 'vitest';
import {
  expectAllowed,
  expectRefused,
  runnableFor,
} from '../_support/role-spec';

/**
 * Platform Support
 *
 * OWNS: The organization lifecycle (create and delete); editing an
 * organization's packs, hubs and the templates inside; the platform forum; admin
 * rights inside a space ONLY where that space enables the support flag.
 *
 * MUST NOT: Moving those resources; deleting the pack or hub itself; any space
 * that has not enabled the flag; role assignment; settings; operations; user
 * records.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "PLATFORM_SUPPORT".
 */
const ROLE = 'PLATFORM_SUPPORT';
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
