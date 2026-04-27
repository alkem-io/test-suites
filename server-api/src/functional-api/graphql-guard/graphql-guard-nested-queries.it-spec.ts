import {
  sorted_read_readAbout_readLicense,
  sorted_read_readAbout_readLicense_notifications,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  getPrivateSpaceData,
  getSpaceData,
  getSpacesData,
} from '@functional-api/journey/space/space.request.params';
import {
  getSubspaceData,
  getSubspacesData,
} from '@functional-api/journey/subspace/subspace.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * GraphQL Guard - Nested Query & DataLoader Batching Tests
 *
 * These tests exercise deeply nested GraphQL queries that trigger
 * multiple guard invocations per request. The synchronous guard
 * (PR #5848) was designed to preserve event loop tick-based batching
 * for DataLoaders by avoiding async operations in canActivate().
 *
 * The tests verify:
 * 1. Deeply nested queries return complete, correct data
 * 2. Multiple concurrent queries from different users return correct results
 * 3. All authorization fields are correctly populated at every nesting level
 * 4. The response structure is complete (no missing/null fields from broken batching)
 */

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'graphql-guard-nested',
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
      privacy: { mode: SpacePrivacyMode.Public },
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

/** @testCase TC-1003 */
describe('GraphQL Guard - Nested Query Data Integrity', () => {
  describe('Deep space hierarchy query (space -> subspace -> subsubspace)', () => {
    test('GetSpaceData returns complete nested hierarchy for global admin', async () => {
      const response = await getSpaceData(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const space = response?.data?.lookup?.space;

      // Level 0: Space
      expect(space).toBeDefined();
      expect(space?.id).toBe(baseScenario.space.id);
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );
      expect(space?.about?.profile?.displayName).toBe(
        baseScenario.space.about.profile.displayName
      );
      expect(space?.community?.id).toBe(baseScenario.space.community.id);
      expect(space?.collaboration?.id).toBe(
        baseScenario.space.collaboration.id
      );

      // Level 1: Subspace
      expect(space?.subspaces).toBeDefined();
      const subspace = space?.subspaces?.find(
        (s: { id: string }) => s.id === baseScenario.subspace.id
      );
      expect(subspace).toBeDefined();
      expect(subspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );
      expect(subspace?.about?.profile?.displayName).toBe(
        baseScenario.subspace.about.profile.displayName
      );
      expect(subspace?.community?.id).toBe(baseScenario.subspace.community.id);
    });

    test('GetSubspacesData returns nested subspace -> subsubspace with all auth fields', async () => {
      const response = await getSubspacesData(baseScenario.space.id);
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();
      expect(space?.subspaces).toBeDefined();
      expect(space?.subspaces?.length).toBeGreaterThanOrEqual(1);

      // Verify L1 subspace data completeness
      const subspace = space?.subspaces?.find(
        (s: { id: string }) => s.id === baseScenario.subspace.id
      );
      expect(subspace).toBeDefined();
      expect(subspace?.nameID).toBe(baseScenario.subspace.nameId);
      expect(subspace?.about?.profile?.displayName).toBe(
        baseScenario.subspace.about.profile.displayName
      );
      expect(subspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );
      expect(subspace?.community?.id).toBe(baseScenario.subspace.community.id);
      expect(subspace?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );

      // Verify L2 subsubspace data completeness
      expect(subspace?.subspaces).toBeDefined();
      const subsubspace = subspace?.subspaces?.find(
        (s: { id: string }) => s.id === baseScenario.subsubspace.id
      );
      expect(subsubspace).toBeDefined();
      expect(subsubspace?.nameID).toBe(baseScenario.subsubspace.nameId);
      expect(subsubspace?.about?.profile?.displayName).toBe(
        baseScenario.subsubspace.about.profile.displayName
      );
      expect(subsubspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );
      expect(subsubspace?.community?.id).toBe(
        baseScenario.subsubspace.community.id
      );
      expect(subsubspace?.collaboration?.id).toBe(
        baseScenario.subsubspace.collaboration.id
      );
    });

    test('Subspace page query returns complete nested data with collaboration', async () => {
      const response = await getSubspaceData(
        baseScenario.subspace.id,
        TestUser.SUBSPACE_ADMIN
      );
      const subspace = response?.data?.lookup?.space;

      expect(subspace).toBeDefined();
      expect(subspace?.id).toBe(baseScenario.subspace.id);

      // Verify L1 authorization privileges
      expect(subspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin
      );

      // Verify community nested data — concrete ID match
      expect(subspace?.community?.id).toBe(baseScenario.subspace.community.id);

      // Verify collaboration nested data — concrete ID match
      expect(subspace?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );

      // Verify L2 subsubspaces — concrete ID matches
      expect(subspace?.subspaces).toBeDefined();
      expect(subspace?.subspaces?.length).toBeGreaterThanOrEqual(1);
      const subsubspace = subspace?.subspaces?.find(
        (s: { id: string }) => s.id === baseScenario.subsubspace.id
      );
      expect(subsubspace).toBeDefined();
      expect(subsubspace?.community?.id).toBe(
        baseScenario.subsubspace.community.id
      );
      expect(subsubspace?.collaboration?.id).toBe(
        baseScenario.subsubspace.collaboration.id
      );
    });
  });

  describe('Concurrent queries from different users', () => {
    test('Parallel requests from different users return correct user-specific authorization', async () => {
      // Fire parallel queries for same space from different user roles.
      // This exercises the guard's ability to correctly attribute
      // req.user without cross-contamination between concurrent requests.
      // Use getPrivateSpaceData (lightweight query) for member/non-member
      // since the full GetSpaceData query requests nested fields (community
      // groups, roleSet, applications) that non-admin users cannot access.
      const [adminRes, memberRes, nonMemberRes] = await Promise.all([
        getSpaceData(baseScenario.space.id, TestUser.GLOBAL_ADMIN),
        getPrivateSpaceData(baseScenario.space.id, TestUser.SPACE_MEMBER),
        getPrivateSpaceData(baseScenario.space.id, TestUser.NON_SPACE_MEMBER),
      ]);

      // Admin should have full platform admin privileges
      expect(
        adminRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );

      // Member should have read-only privileges
      expect(
        memberRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(sorted_read_readAbout_readLicense_notifications);

      // Non-member should have limited read access for public space
      expect(
        nonMemberRes?.data?.lookup?.space?.authorization?.myPrivileges?.sort()
      ).toEqual(sorted_read_readAbout_readLicense);
    });

    test('Parallel nested queries return correct data per role', async () => {
      // The full GetSubspacePage query requests deeply nested fields
      // (community groups, roleSet, applications) that a regular member
      // cannot access on a private subspace. Use two admins at different
      // levels to verify parallel requests return correct, distinct data.
      const [subspaceAdmin, globalAdmin] = await Promise.all([
        getSubspaceData(baseScenario.subspace.id, TestUser.SUBSPACE_ADMIN),
        getSubspaceData(baseScenario.subspace.id, TestUser.GLOBAL_ADMIN),
      ]);

      const subspaceAdminData = subspaceAdmin?.data?.lookup?.space;
      const globalAdminData = globalAdmin?.data?.lookup?.space;

      // Both should get subspace data
      expect(subspaceAdminData).toBeDefined();
      expect(globalAdminData).toBeDefined();

      // Subspace admin should have space-admin-level privileges
      expect(subspaceAdminData?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin
      );

      // Global admin should have platform-admin-level privileges
      expect(globalAdminData?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );

      // Both should see nested community data — concrete ID match
      expect(subspaceAdminData?.community?.id).toBe(
        baseScenario.subspace.community.id
      );
      expect(globalAdminData?.community?.id).toBe(
        baseScenario.subspace.community.id
      );

      // Both should see nested collaboration data — concrete ID match
      expect(subspaceAdminData?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );
      expect(globalAdminData?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );

      // Both should see subsubspaces
      expect(subspaceAdminData?.subspaces?.length).toBeGreaterThanOrEqual(1);
      expect(globalAdminData?.subspaces?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Complete hierarchy data integrity at every nesting level', () => {
    test('Every level in the hierarchy returns correct IDs and authorization', async () => {
      const response = await getSpaceData(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const space = response?.data?.lookup?.space;

      // Space level authorization — exact privilege verification
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );

      // Space > about — concrete ID match
      expect(space?.about?.id).toBe(baseScenario.space.about.id);

      // Space > community — concrete ID match
      expect(space?.community?.id).toBe(baseScenario.space.community.id);

      // Space > collaboration — concrete ID match
      expect(space?.collaboration?.id).toBe(
        baseScenario.space.collaboration.id
      );

      // Space > account — verify present
      expect(space?.account?.id).toBeDefined();

      // Subspace level — scenario always creates at least one subspace
      expect(space?.subspaces?.length).toBeGreaterThan(0);
      const subspace = space?.subspaces?.[0];

      // Subspace authorization — exact privilege verification
      expect(subspace?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin
      );

      // Subspace > community — concrete ID match
      expect(subspace?.community?.id).toBe(baseScenario.subspace.community.id);

      // Subspace > collaboration — concrete ID match
      expect(subspace?.collaboration?.id).toBe(
        baseScenario.subspace.collaboration.id
      );
    });
  });

  describe('Spaces list query with guard on multiple top-level items', () => {
    test('GetSpacesData returns a list of spaces without errors', async () => {
      const response = await getSpacesData(TestUser.GLOBAL_ADMIN);

      expect(response?.data?.spaces).toBeDefined();
      expect(Array.isArray(response?.data?.spaces)).toBe(true);
      expect(response?.data?.spaces?.length).toBeGreaterThanOrEqual(1);

      // Verify our test space is in the list
      const testSpace = response?.data?.spaces?.find(
        (s: { id: string }) => s.id === baseScenario.space.id
      );
      expect(testSpace).toBeDefined();
    });

    test('GetSpacesData as space member returns spaces list', async () => {
      const response = await getSpacesData(TestUser.SPACE_MEMBER);

      expect(response?.data?.spaces).toBeDefined();
      expect(Array.isArray(response?.data?.spaces)).toBe(true);
      // Member should see at least one space (might be their own or public ones)
      expect(response?.data?.spaces?.length).toBeGreaterThanOrEqual(1);
    });
  });
});
