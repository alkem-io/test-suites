import { describe } from 'vitest';
import { expectRefused, runnableFor } from '../_support/role-spec';

/**
 * Feature Beta Tester
 *
 * OWNS: Carries the trial license entitlement. Owns no administrative
 * capability.
 *
 * MUST NOT: Every administrative capability - including creating organizations,
 * which moved to Feature Organization Creator.
 *
 * The capabilities behind the two blocks below come from
 * `../capabilities.data.ts`; the readable list for this role is generated into
 * `../platform-roles-test-plan.md`, section "FEATURE_BETA_TESTER".
 */
const ROLE = 'FEATURE_BETA_TESTER';
const { cannot } = runnableFor(ROLE);

describe(ROLE, () => {
  // Refused AT THE AUTHORIZATION GATE — a validation error, a not-found or a
  // forbidden sub-field does not count. Negatives run first: they change no
  // state, so a positive can never starve one of its target.
  describe('cannot', () => {
    for (const capability of cannot) expectRefused(ROLE, capability);
  });
  // No `can` block: this role owns no administrative capability, so it has no
  // row of its own in the capability table. What it DOES confer is proven by
  // scenario F1 in `rules/feature-roles.it-spec.ts`.
});
