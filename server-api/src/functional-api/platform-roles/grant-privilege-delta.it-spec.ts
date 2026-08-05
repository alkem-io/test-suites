import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  expectSamePrivilegeSets,
  privilegeDelta,
  reportedForToken,
} from './helpers/privileges';
import type { Reported } from './helpers/privileges';
import { expectedDeltaFor, GRANTABLE_TO_HUMAN } from './helpers/a-row-contract';
import {
  createDisposableSubject,
  destroyDisposableSubject,
} from './helpers/disposable-subject';
import type { DisposableSubject } from './helpers/disposable-subject';

/**
 * workspace#027-platform-role-redesign — the grant/revoke PRIVILEGE DELTA,
 * measured on the SUBJECT (handover group B: B2, B3, B6).
 *
 * DIVISION OF LABOUR — read this before adding anything here, so that a move
 * in the assignment surface never has to be chased through two files:
 *
 *  * `grantability.it-spec.ts` owns SC-009: grant + revoke round-trip for all
 *    13 roles, verified through the HOLDER LIST, as the GRANTER. That is the
 *    "can it be assigned at all" property, and it stays there.
 *  * THIS file owns the three things asserted nowhere else:
 *      B2 — `platform.roleSet.myRoles` read AS THE SUBJECT across a grant
 *           boundary, on the SAME token, with no re-login and no wait.
 *      B3 — the EXACT privilege delta on BOTH policies equals the role's
 *           contract row.
 *      B6 — after the revoke, the FULL privilege set on BOTH policies is
 *           identical to the pre-grant baseline.
 *
 * The mutation succeeding (or failing) is a PRECONDITION for measuring the
 * delta here, not an assertion this file owns. Do NOT add standalone `it()`s
 * asserting "the grant succeeds" / "the revoke succeeds" — grantability
 * already states that, and a second statement of it is what makes a surface
 * change red in two places at once.
 *
 * WHY A DISPOSABLE SUBJECT, and not either existing option:
 *
 *  * `fixtures.rolesProbeUserId` is minted with a bare `createUser()`. It has
 *    no Kratos identity and therefore no `authToken`, so it can be the TARGET
 *    of a grant but never the CALLER — which is precisely why grantability,
 *    immediacy and the `flows/` specs all fall back to reading the GRANTER's
 *    holder list instead of the subject's own `myRoles`.
 *  * `TestUser.NON_SPACE_MEMBER` can authenticate, but it is shared by 68+
 *    spec files, several of which assert it is DENIED things. Cycling twelve
 *    platform roles through it would red unrelated suites for the duration of
 *    the run.
 *
 * WHY EXACT-SET EQUALITY on the delta, when `role-privilege-contract.it-spec.ts`
 * already asserts the same privileges: that file asserts steady-state
 * MEMBERSHIP with `toContain`, and containment is structurally blind to an
 * OVER-BROAD role that also reports something extra. The exact added-set
 * equality below is the only assertion in this tree that can see one.
 *
 * `PlatformSpacesReader` is absent from `GRANTABLE_TO_HUMAN` by construction:
 * granting it to a human is rejected with 'Rejected: platform-spaces-reader
 * may only be granted to a service account' (ruleId
 * `spaces-reader-service-account`). That is handover case D2 and
 * `assignment-rules.it-spec.ts` owns it.
 *
 * `FeatureBetaTester` has a side effect beyond the platform credential — it
 * also grants the subject's ACCOUNT an `ACCOUNT_LICENSE_PLUS` credential and
 * resets the account license. Every assertion here is deliberately scoped to
 * the two PLATFORM policies; do not reach for account-scoped state or that
 * iteration goes red for a reason this file is not about.
 */

let subject: DisposableSubject;
let baseline: Reported;

/**
 * Names the role granted by the PREVIOUS iteration, so that a contaminated
 * subject reports the leak rather than the symptom.
 */
let previousRole: RoleName | null = null;

beforeAll(async () => {
  subject = await createDisposableSubject('grant-delta-subject');
  baseline = await reportedForToken(subject.token);

  // P3, ASSERTED rather than assumed. Measured live 2026-08-05 for a fresh
  // registered user: platform = ['ACCESS_INTERACTIVE_GUIDANCE','READ_USERS'],
  // roleSet = [], myRoles = ['REGISTERED']. Only `myRoles` is pinned here —
  // the two baseline platform privileges are whatever the platform grants
  // every authenticated user, are not this feature's to own, and are compared
  // by DELTA below rather than by value.
  expect(
    baseline.myRoles,
    'the disposable subject is not zero-role at the start of this file — every delta below would be measured against a contaminated baseline'
  ).toEqual(['REGISTERED']);
}, 300_000);

afterAll(async () => {
  if (subject) {
    await destroyDisposableSubject(subject.id);
  }
});

describe.each(GRANTABLE_TO_HUMAN)(
  'grant/revoke privilege delta on the subject — %s',
  role => {
    // Each role gets its OWN `it()` with its OWN try/finally and a
    // best-effort revoke, rather than one shared loop under a single outer
    // finally. A `platform-roles-admin` leaked by an early iteration makes a
    // later `platform-audit-reader` grant hit rule 4 (audit-reader-exclusion),
    // and the resulting rejection reads as a defect in a role that is fine.
    it(`${role}: the subject sees the role and exactly its contract privileges, and loses both on revoke`, async () => {
      const globalAdminToken = TestUserManager.users.globalAdmin.authToken;

      // A grant of a role the subject ALREADY holds is an idempotent no-op on
      // a different code path (an audit-write failure is COMPENSATED on a real
      // grant — credential revoked and the error rethrown — but only LOGGED on
      // a no-op), so a contaminated subject silently changes what is measured
      // here without failing anything.
      const before = await reportedForToken(subject.token);
      expect(
        before.myRoles,
        `the subject is not zero-role before granting ${role} — the previous iteration (${previousRole ?? 'none'}) leaked its grant`
      ).toEqual(['REGISTERED']);
      previousRole = role;

      const expected = expectedDeltaFor(role);
      if (!expected) {
        throw new Error(
          `a-row-contract has no row for ${role}, but it is listed in GRANTABLE_TO_HUMAN`
        );
      }

      let revoked = false;
      try {
        // The input type is exactly `{ actorID: UUID!, role: RoleName! }` —
        // there is no `userID` and no nested payload.
        await getGraphqlClient().assignPlatformRoleToUser(
          { roleData: { actorID: subject.id, role } },
          { authorization: `Bearer ${globalAdminToken}` }
        );

        // THE SAME TOKEN, no re-login, no sleep — that is the FR-031 claim,
        // and a wait here would turn this assertion into its opposite.
        const held = await reportedForToken(subject.token);

        // B2 — the subject sees its own new role.
        expect(
          held.myRoles,
          `${role} was granted but the subject's own myRoles does not report it on the very next request`
        ).toContain(role);

        // B3 — the EXACT added set on each policy, independently.
        const delta = privilegeDelta(baseline, held);
        expect(
          delta.platformAdded,
          `${role} added the wrong privilege set on the PLATFORM policy`
        ).toEqual([...expected.platform].sort());
        expect(
          delta.roleSetAdded,
          `${role} added the wrong privilege set on the ROLE SET policy`
        ).toEqual([...expected.roleSet].sort());
        expect(
          delta.platformRemoved,
          `granting ${role} REMOVED a platform-policy privilege — a grant must never take anything away`
        ).toEqual([]);
        expect(
          delta.roleSetRemoved,
          `granting ${role} REMOVED a role-set-policy privilege — a grant must never take anything away`
        ).toEqual([]);

        await getGraphqlClient().removePlatformRoleFromUser(
          { roleData: { actorID: subject.id, role } },
          { authorization: `Bearer ${globalAdminToken}` }
        );
        revoked = true;

        const after = await reportedForToken(subject.token);

        // B5-lite — the role itself is gone from the subject's own view.
        expect(
          after.myRoles,
          `${role} was revoked but the subject still reports it`
        ).not.toContain(role);

        // B6 — and so is every privilege it brought, on BOTH policies. Set
        // equality, never containment: the failure mode being pinned is a
        // cascaded privilege LEFT BEHIND by the revoke, which every
        // containment assertion in this tree passes cleanly.
        expectSamePrivilegeSets(
          baseline,
          after,
          `revoking ${role} left residue on one of the two platform policies`
        );
      } finally {
        if (!revoked) {
          await getGraphqlClient()
            .removePlatformRoleFromUser(
              { roleData: { actorID: subject.id, role } },
              { authorization: `Bearer ${globalAdminToken}` }
            )
            .catch(() => {
              // best-effort: a failed assertion must surface as itself, not be
              // replaced by a teardown error.
            });
        }
      }
    });
  }
);
