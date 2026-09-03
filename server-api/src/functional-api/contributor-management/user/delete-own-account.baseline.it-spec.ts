/**
 * T101 — the Fork-5 falsification gate (054-delete-own-account,
 * contracts/deleteuser-self-branch.md §1).
 *
 * MUST run against a develop-SHA stack BEFORE any server repair for this
 * feature merges. It pins TWO things the spec's "inverted framing" claims are
 * already true today, purely by static analysis:
 *
 *   (a) a plain, freshly registered user is AUTHORIZED to call `deleteUser`
 *       on themselves — no admin-only guard exists on the self path;
 *   (b) that mutation reports a post-commit ERROR even though the account is
 *       actually gone — the crash `contracts/deleteuser-self-branch.md` §4
 *       and `graphql-account-deletion.md` exist to fix.
 *
 * If either assertion below is FALSE against the pre-repair stack, the
 * static analysis was wrong and the workspace plan must be re-opened BEFORE
 * any repair work continues — this spec is the arbiter, not the plan.
 *
 * Deliberately excluded from ordinary runs: once the repair lands, (b) is
 * supposed to flip (that is the whole point of the feature), so this file
 * would start failing for the RIGHT reason and be indistinguishable from a
 * real regression. It only runs when explicitly opted in, against a stack
 * known to predate the repair.
 */
import { createDisposableSelfUser } from './delete-own-account.request.params';
import { deleteUserAsSelf, queryHarnessDb } from '@alkemio/tests-lib';

const RUN_BASELINE_GATE = process.env.RUN_DELETE_ACCOUNT_BASELINE_GATE === 'true';

describe.skipIf(!RUN_BASELINE_GATE)(
  'delete-own-account — T101 falsification gate (pre-repair stack only)',
  () => {
    test('a plain user can call deleteUser on themselves, and it reports a post-commit error despite the account being gone', async () => {
      const user = await createDisposableSelfUser('baseline-t101');
      // The plain non-interactive-login bearer, not a fabricated BFF
      // session: pre-repair there is no freshness gate to satisfy, and this
      // is the simplest reproduction of "any authenticated caller" the spec's
      // inverted framing describes.
      const auth = { bearerToken: user.token };

      // (a) authorized: NOT a FORBIDDEN/UNAUTHENTICATED refusal.
      const deletionResponse = await deleteUserAsSelf(user.userId, auth);
      const errorCodes = (deletionResponse.body.errors ?? []).map(
        e => (e as { extensions?: { code?: string } }).extensions?.code
      );
      expect(errorCodes).not.toContain('FORBIDDEN');
      expect(errorCodes).not.toContain('UNAUTHENTICATED');
      expect(errorCodes).not.toContain('FORBIDDEN_POLICY');

      // (b) the crash: today the mutation reports an error post-commit.
      // (Once the repair lands, this specific assertion is EXPECTED to
      // start failing — see the file header. That is this spec doing its
      // job, not a regression.)
      expect(deletionResponse.body.errors?.length ?? 0).toBeGreaterThan(0);

      // (c) despite the reported error, the row is actually gone — read
      // directly (not via GraphQL: on a pre-repair stack the account is
      // already unreachable through the API by the time this runs).
      const remaining = await queryHarnessDb<{ id: string }>(
        'SELECT id FROM "user" WHERE id = $1',
        [user.userId]
      );
      expect(remaining).toHaveLength(0);
    });
  }
);
