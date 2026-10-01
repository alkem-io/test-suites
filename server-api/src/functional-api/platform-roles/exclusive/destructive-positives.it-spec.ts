import { describe, expect, inject, test } from 'vitest';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { allowedRoles, CAPABILITIES } from '../capabilities.data';
import { invocationFor } from '../_support/groups';
import { classify, describeOutcome } from '../_support/outcome';
import { bearer } from '../_support/types';
import type { GroupFixtures } from '../_support/types';

/**
 * The positives the normal project must never run: each one acts on the whole
 * platform or on a singleton. Project `platform-roles-exclusive` — on demand
 * only, on a stack nobody else is using, never part of the nightly.
 *
 * Serial by construction: one file, no `concurrent`, and the project disables
 * file parallelism. Singleton state is snapshotted in the group's `build()` and
 * put back by the invocation's own `verify`.
 */
const exclusive = CAPABILITIES.filter(c => c.positive.status === 'exclusive');

/**
 * `PLATFORM_ROLES_EXCLUSIVE_SKIP=A3.authorizationPolicyResetAll,…` leaves named
 * capabilities out — visibly, as skipped tests. The case that needs it:
 * `authorizationPolicyResetAll` is executed by the separate auth-reset WORKER,
 * and a worker image older than the server under test rewrites every policy
 * with stale rules. Rebuild the worker before running that one.
 */
const skipped = new Set(
  (process.env.PLATFORM_ROLES_EXCLUSIVE_SKIP ?? '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
);

describe('platform-wide positives', () => {
  for (const capability of exclusive) {
    describe(capability.id, () => {
      const found = invocationFor(capability.id);
      if (!found) {
        test.todo(`${capability.id} has no invocation`);
        return;
      }
      const { group, invocation } = found;

      for (const role of allowedRoles(capability)) {
        test.skipIf(skipped.has(capability.id))(
          `positive: ${role} can`,
          async () => {
            const ctx = inject('platformRoles');
            const fx = ctx.fixtures[group.group] as GroupFixtures;
            const sdk = getGraphqlClient();

            const outcome = await classify(invocation.gate, () =>
              invocation.call(sdk, bearer(ctx.tokens[role]), fx, role)
            );

            expect(outcome.kind, describeOutcome(outcome)).toBe('ok');
            expect(
              invocation.verify,
              `${capability.id} must assert its success payload`
            ).toBeTypeOf('function');
            await invocation.verify?.({
              ctx,
              fx,
              role,
              data: (outcome as { data: unknown }).data,
              sdk,
              reader: bearer(ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS),
              caller: { token: ctx.tokens[role], id: ctx.userIds[role] },
            });
          }
        );
      }
    });
  }
});
