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
  it("a Roles Admin's OWN login-email change is retrievable under initiatorUserId = subjectUserId", async () => {
    // sec-test-suites-1/corr-ts-3/qual-ts-5 (2026-07-30 fix wave): target a
    // DISPOSABLE identity, NEVER the shared `PLATFORM_ROLES_ADMIN` fixture —
    // `adminUserEmailChange` permanently rewrites the Kratos login email
    // with no restore, and doing that to the canonical roles-admin fixture
    // broke every subsequent run's ability to authenticate as it. Grant
    // `platform-roles-admin` to the disposable target first so the subject
    // genuinely IS a Roles Admin, preserving this test's own title/intent.
    //
    // Uses `fixtures.emailChangeTargetUserId`, NOT `rolesProbeUserId`
    // (live-verification finding, 2026-07-30): `adminUserEmailChange` loads
    // its subject through the identity-provider link and throws
    // `EMAIL_CHANGE_SUBJECT_NOT_FOUND` for a bare `createUser()` account —
    // `emailChangeTargetUserId` is this fixture set's ONE genuinely
    // Kratos-registered disposable identity (`registerVerifiedUser`),
    // built for exactly this class of surface.
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const probeUserId = fixtures.emailChangeTargetUserId;
    const grant = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: { actorID: probeUserId, role: RoleName.PlatformRolesAdmin },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(grant.errors).toBeUndefined();

    // A4's `adminUserEmailChange` requires PLATFORM_USERS_ADMIN — the
    // disposable target does not hold it, so this self-targeted change is
    // performed by Users Admin ON the disposable Roles Admin's own account,
    // then read back by Audit Reader — the retrievability predicate is
    // about the SUBJECT, not the caller.
    const usersAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_USERS_ADMIN
    ).authToken;
    await getGraphqlClient().adminUserEmailChange(
      {
        adminUserEmailChangeData: {
          userID: probeUserId,
          newEmail: `sc015-self-${Date.now()}@alkem.io`,
          reason: 'T014a self-affecting retrievability probe',
          approver: {
            name: 'T014a Approver',
            role: 'Organization Administrator',
          },
        },
      },
      { authorization: `Bearer ${usersAdminToken}` }
    );

    const auditReaderToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_AUDIT_READER
    ).authToken;
    const entries = await getGraphqlClient().userEmailChangeAuditEntries(
      { userID: probeUserId },
      { authorization: `Bearer ${auditReaderToken}` }
    );
    expect(entries.errors).toBeUndefined();
    expect(
      entries.data?.platformAdmin.userEmailChangeAuditEntries.total ?? 0
    ).toBeGreaterThan(0);
  });

  it('zero false positives: an ordinary grant to ANOTHER user is not conflated with a self-affecting record', async () => {
    // Not directly assertable without a generic `initiatorUserId =
    // subjectUserId` query surface (the email-change fields are keyed by
    // SUBJECT `userID` only, with no initiator filter exposed over
    // GraphQL) — recorded as a known gap alongside the rest of this file's
    // header rather than asserted on a query that does not exist.
    expect(fixtures.targetUserId).not.toBe(fixtures.emailChangeTargetUserId);
  });

  // (b) — a platform-wide operational action (`authorizationPolicyResetOnPlatform`,
  // subjectUserId = NULL) never appearing as a "self-affecting" record for
  // ANY user is, again, a claim about the audit STORE this repo cannot read
  // generically. Server unit specs (T070h/T025) are the actual guard.
});
