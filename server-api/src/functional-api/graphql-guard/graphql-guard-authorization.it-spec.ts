import {
  readAboutPrivilege,
  sorted_read_readAbout_readLicense_notifications,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notificationsAdmin,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  getSpaceData,
  getPrivateSpaceData,
} from '@functional-api/journey/space/space.request.params';
import { getSubspaceData } from '@functional-api/journey/subspace/subspace.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

/**
 * GraphQL Guard Authorization Tests
 *
 * These tests validate that the synchronous GraphqlGuard (PR #5848)
 * correctly enforces access control across the space hierarchy.
 *
 * The guard was rewritten from an async Passport-based AuthGuard to a
 * synchronous CanActivate implementation that reads req.user set by
 * AuthInterceptor. These tests ensure that authorization decisions
 * remain correct after the rewrite.
 */

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'graphql-guard-auth',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Private },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: { policy: CommunityMembershipPolicy.Applications },
        },
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('GraphQL Guard - Synchronous Authorization', () => {
  describe('Space-level authorization privileges', () => {
    test.each`
      user                             | spaceMyPrivileges
      ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin}
      ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notificationsAdmin}
      ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin}
      ${TestUser.SPACE_MEMBER}         | ${sorted_read_readAbout_readLicense_notifications}
      ${TestUser.NON_SPACE_MEMBER}     | ${readAboutPrivilege}
    `(
      'User: "$user" has correct space authorization privileges',
      async ({ user, spaceMyPrivileges }) => {
        const request = await getPrivateSpaceData(baseScenario.space.id, user);
        const result = request?.data?.lookup?.space;

        expect(result?.authorization?.myPrivileges?.sort()).toEqual(
          spaceMyPrivileges
        );
      }
    );
  });

  describe('Space data integrity for authenticated users', () => {
    test('Global admin can read full space data with nested fields', async () => {
      // Use the full GetSpaceData query to verify nested data structure
      const response = await getSpaceData(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const space = response?.data?.lookup?.space;

      // Verify space core data is returned
      expect(space).toBeDefined();
      expect(space?.id).toBe(baseScenario.space.id);
      expect(space?.nameID).toBe(baseScenario.space.nameId);

      // Verify authorization privileges match expected set
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );

      // Verify about section — concrete ID and profile match
      expect(space?.about?.id).toBe(baseScenario.space.about.id);
      expect(space?.about?.profile?.displayName).toBe(
        baseScenario.space.about.profile.displayName
      );

      // Verify community data — concrete ID match
      expect(space?.community?.id).toBe(baseScenario.space.community.id);

      // Verify collaboration data — concrete ID match
      expect(space?.collaboration?.id).toBe(
        baseScenario.space.collaboration.id
      );

      // Verify subspaces are returned
      expect(space?.subspaces).toBeDefined();
      expect(space?.subspaces?.length).toBeGreaterThanOrEqual(1);
    });

    test('Space admin has correct privileges', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_ADMIN
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();
      expect(space?.nameID).toBe(baseScenario.space.nameId);

      // Admin should have elevated privileges
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin
      );
    });

    test('Space member has limited privileges', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_MEMBER
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();
      expect(space?.nameID).toBe(baseScenario.space.nameId);

      // Member should have read-only privileges
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted_read_readAbout_readLicense_notifications
      );
    });
  });

  describe('Anonymous user access', () => {
    test('Anonymous user cannot access private space data', async () => {
      // Call graphqlErrorWrapper directly without a role to get a truly
      // unauthenticated request. Omit the Authorization header entirely.
      const graphqlClient = getGraphqlClient();
      const callback = (authToken: string | undefined) =>
        graphqlClient.PrivateSpaceData(
          { nameId: baseScenario.space.id },
          authToken ? { authorization: `Bearer ${authToken}` } : {}
        );
      const request = await graphqlErrorWrapper(callback);
      const result = request?.data?.lookup?.space;

      // Anonymous user gets only READ_ABOUT for private space
      expect(result?.authorization?.myPrivileges?.sort()).toEqual(
        readAboutPrivilege
      );
    });
  });

  describe('Subspace-level authorization', () => {
    test('Subspace admin can read subspace with full nested data', async () => {
      // Use the full GetSubspacePage query to verify nested data accessibility
      const response = await getSubspaceData(
        baseScenario.subspace.id,
        TestUser.SUBSPACE_ADMIN
      );
      const subspace = response?.data?.lookup?.space;

      expect(subspace).toBeDefined();
      expect(subspace?.id).toBe(baseScenario.subspace.id);

      // Subspace admin should have elevated privileges
      expect(subspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin
      );

      // Verify nested community data — concrete ID match
      expect(subspace?.community?.id).toBe(baseScenario.subspace.community.id);

      // Verify nested collaboration data — concrete ID match
      expect(subspace?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );

      // Verify nested subspaces (subsubspaces) are accessible
      expect(subspace?.subspaces?.length).toBeGreaterThanOrEqual(1);
    });

    test('Space member without subspace membership has restricted access', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.subspace.id,
        TestUser.SPACE_MEMBER
      );
      const space = response?.data?.lookup?.space;

      // Space member who is not a subspace member should only have READ_ABOUT
      expect(space).toBeDefined();
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        readAboutPrivilege
      );
    });

    test('Non-space member cannot access private subspace', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.subspace.id,
        TestUser.NON_SPACE_MEMBER
      );

      // Server does not expose private subspace to non-members — returns error
      expect(response?.data?.lookup?.space).toBeUndefined();
      expect(response?.error).toBeDefined();
    });
  });

  describe('Subsubspace-level authorization', () => {
    test('Subsubspace admin can read subsubspace data', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.subsubspace.id,
        TestUser.SUBSUBSPACE_ADMIN
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();

      // Subsubspace admin should have elevated privileges
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin
      );
    });

    test('Subsubspace member has read access with limited privileges', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.subsubspace.id,
        TestUser.SUBSUBSPACE_MEMBER
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();

      // Member should have read-only privileges
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted_read_readAbout_readLicense_notifications
      );
    });
  });

  describe('Cross-level authorization consistency', () => {
    test('Global admin has consistent elevated access across all levels', async () => {
      const [spaceRes, subspaceRes, subsubspaceRes] = await Promise.all([
        getPrivateSpaceData(baseScenario.space.id, TestUser.GLOBAL_ADMIN),
        getPrivateSpaceData(baseScenario.subspace.id, TestUser.GLOBAL_ADMIN),
        getPrivateSpaceData(baseScenario.subsubspace.id, TestUser.GLOBAL_ADMIN),
      ]);

      const expectedPrivileges =
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin;

      // Global admin should have identical elevated privileges at all levels
      expect(
        spaceRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(expectedPrivileges);
      expect(
        subspaceRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(expectedPrivileges);
      expect(
        subsubspaceRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(expectedPrivileges);
    });

    test('Non-space member has consistently no access to private hierarchy', async () => {
      const [spaceRes, subspaceRes, subsubspaceRes] = await Promise.all([
        getPrivateSpaceData(baseScenario.space.id, TestUser.NON_SPACE_MEMBER),
        getPrivateSpaceData(
          baseScenario.subspace.id,
          TestUser.NON_SPACE_MEMBER
        ),
        getPrivateSpaceData(
          baseScenario.subsubspace.id,
          TestUser.NON_SPACE_MEMBER
        ),
      ]);

      // Non-member gets READ_ABOUT on top-level private space
      expect(
        spaceRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(readAboutPrivilege);

      // Non-member cannot access private subspace — server returns error
      expect(subspaceRes?.data?.lookup?.space).toBeUndefined();
      expect(subspaceRes?.error).toBeDefined();

      // Non-member cannot access private subsubspace — server returns error
      expect(subsubspaceRes?.data?.lookup?.space).toBeUndefined();
      expect(subsubspaceRes?.error).toBeDefined();
    });
  });

  describe('Guard handles error responses correctly', () => {
    test('Requesting a non-existent space returns error, not crash', async () => {
      const fakeSpaceId = '00000000-0000-0000-0000-000000000000';
      const response = await getPrivateSpaceData(
        fakeSpaceId,
        TestUser.GLOBAL_ADMIN
      );
      // Non-existent space should result in an error response
      expect(response?.data?.lookup?.space).toBeUndefined();
      expect(response?.error?.errors[0].message).toEqual(
        "Unable to find Space using options 'undefined'"
      );
      expect(response?.error?.errors).toHaveLength(1);
    });

    test('Forbidden access returns structured error with FORBIDDEN_POLICY code', async () => {
      // Use the full GetSubspacePage query for non-member on private subsubspace
      // to trigger a FORBIDDEN error on nested fields that require elevated access
      const response = await getSubspaceData(
        baseScenario.subsubspace.id,
        TestUser.NON_SPACE_MEMBER
      );

      // Non-member on private subsubspace should always get a FORBIDDEN error
      console.log('Response for non-existent space:', response.error?.errors);

      expect(response?.error?.errors[0].code).toEqual('FORBIDDEN_POLICY');
      expect(response?.error?.errors).toHaveLength(1);
    });
  });
});
