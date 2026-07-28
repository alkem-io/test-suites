import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { buildMatrixFixtures, teardownMatrixFixtures } from '../fixtures';
import type { MatrixFixtures } from '../fixtures';

/**
 * workspace#027-platform-role-redesign (T019b) — [US3]. FLOW 2: an
 * organization holds a `feature-*` role -> an organization admin/owner
 * INHERITS the feature -> demote that user to associate -> DENIED on the
 * next request, not after the 60s actor-context TTL (FR-002, FR-031).
 *
 * Asserted IMMEDIATELY, with no wait added to make it pass — a sleep would
 * turn the FR-031 assertion into its opposite and would mask a missing
 * `ActorContextCacheService.deleteByActorID` call (server T057), which is
 * the only defect this flow exists to catch.
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

describe('flow 2 — organization inheritance then demotion (T019b, FR-002/FR-031)', () => {
  it('an org admin loses an inherited Feature role on the request immediately following demotion — no TTL wait', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const standingUser = TestUserManager.getUserModelByType(
      TestUser.NON_SPACE_MEMBER
    );

    // The organization holds `feature-organization-creator` (A6's create
    // half — the one census entry this role genuinely owns, T007a).
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
      // Promote to ADMIN — inherits the org's credential.
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
            nameID: `flow2-admin-${Date.now()}`,
            profileData: { displayName: 'flow 2 admin probe' },
          },
        },
        { authorization: `Bearer ${standingUser.authToken}` }
      );
      expect(
        asAdmin.errors,
        'the org admin must inherit the Feature role while holding admin standing'
      ).toBeUndefined();
      const createdId = asAdmin.data?.createOrganization?.id;
      if (createdId) {
        await getGraphqlClient().deleteOrganization(
          { deleteData: { ID: createdId } },
          { authorization: `Bearer ${rolesAdminToken}` }
        );
      }

      // DEMOTE to associate — no sleep, no re-login, no reset in between.
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

      // DENIED — the very next request.
      const afterDemotion = await getGraphqlClient().CreateOrganization(
        {
          organizationData: {
            nameID: `flow2-demoted-${Date.now()}`,
            profileData: { displayName: 'flow 2 demoted probe' },
          },
        },
        { authorization: `Bearer ${standingUser.authToken}` }
      );
      expect(
        afterDemotion.errors,
        'demotion must deny the very next request — a pass here would mean the actor-context cache was not invalidated (server T057)'
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
});
