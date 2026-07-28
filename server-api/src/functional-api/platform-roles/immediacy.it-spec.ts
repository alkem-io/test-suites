import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';

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

    const afterRevoke = await getGraphqlClient().userEmailChangeAuditEntries(
      { userID: fixtures.targetUserId },
      { authorization: `Bearer ${targetUser.authToken}` }
    );
    expect(
      afterRevoke.errors,
      'the very next request after a revoke must be denied'
    ).toBeDefined();
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
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      const asAssociate = await getGraphqlClient().CreateOrganization(
        {
          organizationData: {
            nameID: `immediacy-associate-${Date.now()}`,
            profileData: { displayName: 'immediacy associate-only probe' },
          },
        },
        { authorization: `Bearer ${standingUser.authToken}` }
      );
      expect(
        asAssociate.errors,
        'a plain associate must never inherit a Feature role'
      ).toBeDefined();

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
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      const asAdmin = await getGraphqlClient().CreateOrganization(
        {
          organizationData: {
            nameID: `immediacy-admin-${Date.now()}`,
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
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      const afterDemotion = await getGraphqlClient().CreateOrganization(
        {
          organizationData: {
            nameID: `immediacy-demoted-${Date.now()}`,
            profileData: { displayName: 'immediacy demoted probe' },
          },
        },
        { authorization: `Bearer ${standingUser.authToken}` }
      );
      expect(
        afterDemotion.errors,
        'demotion to associate must deny on the very next request — no ActorContext cache lag'
      ).toBeDefined();
    } finally {
      await getGraphqlClient().removeRoleFromUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Associate,
          },
        },
        { authorization: `Bearer ${rolesAdminToken}` }
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
