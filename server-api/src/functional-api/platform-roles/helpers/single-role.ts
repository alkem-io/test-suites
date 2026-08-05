import { expect } from 'vitest';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { Reported } from './privileges';

/**
 * workspace#027-platform-role-redesign — the Slice A soundness guard.
 *
 * Handover §8: Slice A is ADDITIVE. The legacy `GLOBAL_*` credentials still
 * reach everything, so "role X cannot do Y" passes for the wrong reason
 * whenever the actor also carries one of them — the denial that fired was the
 * absence of a credential the test never named, or no denial fired at all and
 * the assertion was satisfied by something unrelated.
 *
 * Any negative assertion in this tree must therefore state, INSIDE the test,
 * that its actor holds exactly one of the thirteen and no legacy credential.
 * That is what this asserts, and it is why it takes the already-read
 * {@link Reported} rather than fetching: the same read that produced the
 * privileges under assertion must be the one that proves the actor's shape.
 */

/**
 * The suffix every failure here ends with. Verbatim and shared, so a reader
 * who hits it in CI gets the reason rather than just the mismatch.
 */
const SLICE_A_SUFFIX =
  '— or this denial passes for the wrong reason (Slice A is additive; the legacy GLOBAL_* credentials still reach everything)';

export const assertSingleRoleActor = (
  reported: Reported,
  role: RoleName
): void => {
  // `REGISTERED` is the baseline every authenticated user carries — it is not
  // one of the thirteen and is subtracted, not asserted against.
  const platformRoles = reported.myRoles.filter(r => r !== 'REGISTERED');

  expect(
    platformRoles,
    `actor should hold exactly ${role} and nothing else (reported: ${reported.myRoles.join(', ') || 'none'}) ${SLICE_A_SUFFIX}`
  ).toEqual([role]);

  expect(
    reported.myRoles.filter(r => r.startsWith('GLOBAL_')),
    `actor for ${role} holds a legacy GLOBAL_* role (reported: ${reported.myRoles.join(', ') || 'none'}) ${SLICE_A_SUFFIX}`
  ).toEqual([]);
};
