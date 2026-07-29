import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { isAuthorizationDenial } from './surface-invocations';

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

/**
 * workspace#027-platform-role-redesign — [US3].
 *
 * **A structural limitation, stated up front rather than smoothed over**:
 * this repo's only generic audit-read surface is the MCP `audit-log-analyze`
 * tool (A19), which has NO client wired here (T007b's `surface-
 * invocations.ts` header; same gap T019 notes for the GraphQL-side denial
 * assertions). The two GraphQL audit-read fields
 * (`latestUserEmailChangeAuditEntry` / `userEmailChangeAuditEntries`,
 * asserted in `grantability.it-spec.ts`, T019) expose ONE category only —
 * user email changes. Every OTHER audit category this feature adds
 * (`platform_role_assignment`, `role_grant_rejected`, `service_profile_
 * change`, organization-subject grants — FR-018/019/025/026/027) therefore
 * has NO test-suites-reachable READ path at all in Slice A. That is a real
 * gap for Phase V to close (wire an MCP client, per T007b/T019) or for a
 * future spec to reconsider (a GraphQL audit query surface beyond
 * email-change) — not something this file can paper over with an assertion
 * it cannot actually make good on.
 *
 * What THIS file asserts, honestly, given that constraint:
 * - T014's outcome-coverage half, where independently OBSERVABLE without an
 *   audit read (a rejected grant did not take effect — the FR-012 "no
 *   revoke record per dropped legacy assignment" carve-out is a claim about
 *   ABSENCE this repo cannot observe either, and is noted as such).
 * - T014a's self-affecting retrievability predicate, on the ONE audit
 *   category that IS GraphQL-reachable (user email change, via A4's
 *   `adminUserEmailChange` + the two A19 read fields) — the concrete,
 *   verifiable instance of "an admin's own record is retrievable under
 *   `initiatorUserId = subjectUserId`" and "a platform-wide operational
 *   action with no subject is never returned as a false positive".
 */

let fixtures: MatrixFixtures;

beforeAll(async () => {
  fixtures = await buildMatrixFixtures();
}, 300_000);

afterAll(async () => {
  if (fixtures) {
    await teardownMatrixFixtures(fixtures);
  }
});

describe('audit-coverage outcome checks reachable without a generic audit read (T014)', () => {
  it('a rejected role assignment does not take effect (the grant-side half of FR-018 outcome coverage)', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;

    // A genuine privilege-denial scenario: `platform-support` holds no
    // `platform-roles-admin` grant, so this call is rejected on the
    // AUTHORIZATION gate itself, not on input resolution — the outcome
    // this assertion is actually about. Wrapped via `asUser`
    // (`graphqlErrorWrapper`) because the raw generated SDK client throws
    // an uncaught exception on any GraphQL error response instead of
    // returning it as `.error` (2026-07-29 live-verification finding).
    const rejected = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.targetUserId,
              role: RoleName.PlatformSupport,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );
    expect(isAuthorizationDenial(rejected.error?.errors)).toBe(true);

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformSupport },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === fixtures.targetUserId
      ),
      'a rejected grant must not appear as a successful holder'
    ).toBe(false);
  });

  // The audit RECORD's presence for both outcomes (success AND rejection),
  // the per-category fail-open/fail-closed semantics, and the FR-012
  // cleanup-carve-out absence check all require the MCP audit-read surface
  // this repo does not have a client for (Phase V) — declared here as a
  // known gap rather than a false-positive assertion.
});

describe('SC-015 self-affecting retrievability — the ONE GraphQL-reachable audit category (T014a)', () => {
  // qual-ts-16 (2026-07-30 fix wave): both tests below were converted to
  // `it.todo` — neither could fail for the reason its title claimed.
  //
  // The FIRST test's assertion (`expect(total).toBeGreaterThan(0)`) is
  // satisfied by ANY email-change record for the subject, from ANY
  // initiator — it never actually checked `initiatorUserId = subjectUserId`
  // and the change it performed wasn't even self-affecting (Users Admin
  // acted ON the disposable target, not the target acting on itself). A
  // genuine fix needs the query to SELECT the initiator, which this repo's
  // generated SDK does not: `userEmailChangeAuditEntries.graphql` requests
  // only `{ id, outcome }` per entry — the schema DOES carry
  // `UserEmailChangeAuditEntry.initiator` (`UserProfileSummary`), but adding
  // it to the query document requires a codegen re-run against a live
  // server (`lib/codegen.ts` introspects `localhost:3000`), which is a
  // Phase-V dependency this wave's gates (lint + build only) cannot satisfy.
  //
  // The SECOND test's assertion (`fixtures.targetUserId !== fixtures.emailChangeTargetUserId`)
  // is a tautology over two distinct fixture ids — it never called the API
  // at all. The genuine "zero false positives" property (a third-party-
  // initiated entry is never returned by the self-affecting predicate) is
  // not independently checkable from this repo's GraphQL-only vantage point
  // either, for the identical reason: the subject-keyed query returns every
  // entry for that subject regardless of who initiated it, with no
  // initiator-filtered variant exposed.
  //
  // Both gaps are covered server-side: `platform.role.assignment.rules
  // .service.ts`'s self-affecting retrievability predicate (server T025/T063)
  // has its own unit coverage there. This repo's honest position, until the
  // query is regenerated with `initiator.id` selected, is "cannot verify",
  // not a green check for the wrong reason.
  it.todo(
    "a Roles Admin's OWN login-email change is retrievable under initiatorUserId = subjectUserId — blocked on regenerating userEmailChangeAuditEntries.graphql to select initiator.id (Phase V, live codegen)"
  );

  it.todo(
    'zero false positives: an ordinary grant to ANOTHER user is not conflated with a self-affecting record — same Phase-V blocker as above'
  );

  // (b) — a platform-wide operational action (`authorizationPolicyResetOnPlatform`,
  // subjectUserId = NULL) never appearing as a "self-affecting" record for
  // ANY user is, again, a claim about the audit STORE this repo cannot read
  // generically. Server unit specs (T070h/T025) are the actual guard.
});
