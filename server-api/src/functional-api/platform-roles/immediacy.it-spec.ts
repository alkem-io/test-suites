import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

/**
 * workspace#027-platform-role-redesign (T013) — [US3]. FR-031/SC-016: a
 * granted role works on the NEXT request and a revoked one is denied on the
 * NEXT request, with no authorization reset, re-login or cache expiry in
 * between. No `sleep()` anywhere in this file — a wait would turn the
 * FR-031 assertion into its opposite (T019b's own warning applies here too).
 *
 * Organization-standing half: an org admin/owner inheriting a `Feature …`
 * role loses it on the next request after demotion to associate, and a
 * plain associate never gains it in the first place — exercised on A6's
 * `createOrganization` surface, the one census entry `feature-organization-
 * creator` genuinely owns (T007a).
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

describe('immediacy on a single surface (T013, FR-031/SC-016)', () => {
  it('a granted role reaches its surface on the very next request; a revoked one is denied on the very next request', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const targetUser = TestUserManager.getUserModelByType(
      TestUser.NON_SPACE_MEMBER
    );

    // A19's read family — PLATFORM_AUDIT_READER is its sole owner, so a
    // grant/revoke round trip here is a clean, side-effect-free (read-only)
    // probe of the timing property.
    await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: {
          actorID: fixtures.targetUserId,
          role: RoleName.PlatformAuditReader,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    const afterGrant = await getGraphqlClient().userEmailChangeAuditEntries(
      { userID: fixtures.targetUserId },
      { authorization: `Bearer ${targetUser.authToken}` }
    );
    expect(
      afterGrant.errors,
      'the very next request after a grant must succeed'
    ).toBeUndefined();

    await getGraphqlClient().removePlatformRoleFromUser(
      {
        roleData: {
          actorID: fixtures.targetUserId,
          role: RoleName.PlatformAuditReader,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    // The raw generated SDK throws a `ClientError` on any GraphQL error
    // response rather than returning it as `.errors` (2026-07-29
    // live-verification finding, reproduced live) — expected-DENIAL calls
    // must go through `graphqlErrorWrapper` (`asUser`) to observe the
    // rejection instead of failing with an unasserted exception.
    const afterRevoke = await asUser(
      token =>
        getGraphqlClient().userEmailChangeAuditEntries(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.NON_SPACE_MEMBER
    );
    expect(
      afterRevoke.error?.errors?.length ?? 0,
      'the very next request after a revoke must be denied'
    ).toBeGreaterThan(0);
  });
});

describe('organization-standing immediacy (T013, FR-002/FR-031)', () => {
  it('an org admin inherits a granted Feature role on the next request, and loses it on the next request after demotion; a plain associate never gains it', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const standingUser = TestUserManager.getUserModelByType(
      TestUser.NON_SPACE_MEMBER
    );

    await getGraphqlClient().assignPlatformRoleToOrganization(
      {
        roleData: {
          actorID: fixtures.secondOrganizationId,
          role: RoleName.FeatureOrganizationCreator,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    // Organization-roleSet membership (Associate/Admin) is managed by
    // organization standing, not by `platform-roles-admin` — that role's
    // scope is PLATFORM role assignment only (`assignPlatformRoleToOrganization`
    // above), and this environment's own roleSet authorization rejects it
    // with `FORBIDDEN_POLICY` for lacking `grant` on an arbitrary
    // organization's roleSet (2026-07-29 live-verification finding). The
    // legacy GLOBAL_ADMIN fixture retains its root-cascade grant privilege
    // for org-membership management through the end of Slice A (test.user.ts
    // T003), so it — not `rolesAdminToken` — is the correct actor for these
    // roleSet mutations; only the Feature-role grant/revoke on the platform
    // roleSet above/below is `platform-roles-admin`'s own surface.
    const globalAdminToken = TestUserManager.users.globalAdmin.authToken;

    try {
      // Associate only — never gains the org's Feature credential.
      await getGraphqlClient().assignRoleToUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Associate,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      // Wrapped via `asUser` — a plain associate is expected to be DENIED
      // `create-organization`, and the raw generated SDK client throws on
      // any GraphQL error response rather than returning it as `.error`
      // (same 2026-07-29 live-verification finding as the A19 probe above).
      // The nameID is also kept short (`UniqueIDGenerator`, not `Date.now()`)
      // so a too-long literal never fails input VALIDATION first and masks
      // the authorization outcome this assertion is actually about.
      const asAssociate = await asUser(
        token =>
          getGraphqlClient().CreateOrganization(
            {
              organizationData: {
                nameID: `assoc-${UniqueIDGenerator.getID()}`,
                profileData: { displayName: 'immediacy associate-only probe' },
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.NON_SPACE_MEMBER
      );
      expect(
        asAssociate.error?.errors?.length ?? 0,
        'a plain associate must never inherit a Feature role'
      ).toBeGreaterThan(0);

      // Promote to Admin — inherits the org's Feature credential on the
      // very next request.
      await getGraphqlClient().assignRoleToUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Admin,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      const asAdmin = await getGraphqlClient().CreateOrganization(
        {
          organizationData: {
            nameID: `admin-${UniqueIDGenerator.getID()}`,
            profileData: { displayName: 'immediacy admin probe' },
          },
        },
        { authorization: `Bearer ${standingUser.authToken}` }
      );
      expect(
        asAdmin.errors,
        'an org admin must inherit the Feature role on the very next request'
      ).toBeUndefined();
      const createdId = asAdmin.data?.createOrganization?.id;
      if (createdId) {
        await getGraphqlClient().deleteOrganization(
          { deleteData: { ID: createdId } },
          { authorization: `Bearer ${rolesAdminToken}` }
        );
      }

      // Demote back to Associate — loses it on the very next request. No
      // sleep, no re-login, no cache-expiry wait — asserted IMMEDIATELY.
      await getGraphqlClient().removeRoleFromUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Admin,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      const afterDemotion = await asUser(
        token =>
          getGraphqlClient().CreateOrganization(
            {
              organizationData: {
                nameID: `demoted-${UniqueIDGenerator.getID()}`,
                profileData: { displayName: 'immediacy demoted probe' },
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.NON_SPACE_MEMBER
      );
      expect(
        afterDemotion.error?.errors?.length ?? 0,
        'demotion to associate must deny on the very next request — no ActorContext cache lag'
      ).toBeGreaterThan(0);
    } finally {
      await getGraphqlClient().removeRoleFromUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Associate,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      await getGraphqlClient().removePlatformRoleFromOrganization(
        {
          roleData: {
            actorID: fixtures.secondOrganizationId,
            role: RoleName.FeatureOrganizationCreator,
          },
        },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
    }
  });

  // No `Platform …` role is EVER conferred by organization standing —
  // there is no census surface where `intendedOwners`/`legacyReachers`
  // include an organization-inheritable credential for a `Platform …` row
  // (T007a), so there is no additional cell this half could regress.
});
