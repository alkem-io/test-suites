import {
  readAboutPrivilege,
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
  updateSpaceSettings,
} from '@functional-api/journey/space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

/**
 * GraphQL Guard - Public/Private Space Access Control
 *
 * Tests the guard's behavior when switching between public and private
 * space modes. The synchronous guard must correctly evaluate the
 * authorization policy on each request using the agent from req.user
 * (or the anonymous agent via AgentInfoService).
 *
 * Key scenarios:
 * - Public space: broader read access for non-members and anonymous
 * - Private space: restricted access for non-members and anonymous
 * - Privacy toggle: authorization changes are reflected immediately
 */

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'graphql-guard-pub-priv',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('GraphQL Guard - Public/Private Space Access', () => {
  describe('Public space access', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                         | spaceMyPrivileges
      ${TestUser.GLOBAL_ADMIN}     | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense_notifications_notificationsAdmin}
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin}
      ${TestUser.SPACE_MEMBER}     | ${sorted_read_readAbout_readLicense_notifications}
      ${TestUser.NON_SPACE_MEMBER} | ${sorted_read_readAbout_readLicense}
    `(
      'User: "$user" has correct privileges for public space',
      async ({ user, spaceMyPrivileges }) => {
        const request = await getPrivateSpaceData(baseScenario.space.id, user);
        const result = request?.data?.lookup?.space;

        expect(result?.authorization?.myPrivileges?.sort()).toEqual(
          spaceMyPrivileges
        );
      }
    );

    test('Non-member has read-only privileges for public space', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();

      // Non-member should have read-only privileges for public space
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        sorted_read_readAbout_readLicense
      );
    });

    test('Anonymous user can read public space basic data', async () => {
      // Call graphqlErrorWrapper directly without a role for anonymous access.
      // Omit the Authorization header entirely when no token is available.
      const graphqlClient = getGraphqlClient();
      const callback = (authToken: string | undefined) =>
        graphqlClient.PrivateSpaceData(
          { nameId: baseScenario.space.id },
          authToken ? { authorization: `Bearer ${authToken}` } : {}
        );
      const request = await graphqlErrorWrapper(callback);
      const result = request?.data?.lookup?.space;

      // Anonymous should get same read privileges as non-member for public space
      expect(result?.authorization?.myPrivileges?.sort()).toEqual(
        sorted_read_readAbout_readLicense
      );
    });
  });

  describe('Private space access', () => {
    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });
    });

    afterAll(async () => {
      // Restore to public for any following tests
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                         | spaceMyPrivileges
      ${TestUser.SPACE_ADMIN}      | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense_notifications_notificationsAdmin}
      ${TestUser.SPACE_MEMBER}     | ${sorted_read_readAbout_readLicense_notifications}
      ${TestUser.NON_SPACE_MEMBER} | ${readAboutPrivilege}
    `(
      'User: "$user" has correct privileges for private space',
      async ({ user, spaceMyPrivileges }) => {
        const request = await getPrivateSpaceData(baseScenario.space.id, user);
        const result = request?.data?.lookup?.space;

        expect(result?.authorization?.myPrivileges?.sort()).toEqual(
          spaceMyPrivileges
        );
      }
    );

    test('Non-member has only READ_ABOUT for private space', async () => {
      const response = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );
      const space = response?.data?.lookup?.space;

      expect(space).toBeDefined();
      // Non-member on private space should only have READ_ABOUT
      expect(space?.authorization?.myPrivileges?.sort()).toEqual(
        readAboutPrivilege
      );
    });

    test('Anonymous user cannot access private space data', async () => {
      // Call graphqlErrorWrapper directly without a role for anonymous access.
      // Omit the Authorization header entirely when no token is available.
      const graphqlClient = getGraphqlClient();
      const callback = (authToken: string | undefined) =>
        graphqlClient.PrivateSpaceData(
          { nameId: baseScenario.space.id },
          authToken ? { authorization: `Bearer ${authToken}` } : {}
        );
      const request = await graphqlErrorWrapper(callback);

      // Anonymous user gets only READ_ABOUT for private space
      const result = request?.data?.lookup?.space;
      expect(result?.authorization?.myPrivileges?.sort()).toEqual(
        readAboutPrivilege
      );
    });
  });

  describe('Privacy toggle - immediate authorization update', () => {
    test('Changing from public to private immediately restricts non-member access', async () => {
      // Start public
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      const publicResponse = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );
      const publicPrivs =
        publicResponse?.data?.lookup?.space?.authorization?.myPrivileges ?? [];

      // Non-member should have READ access to public space
      expect(publicPrivs.sort()).toEqual(sorted_read_readAbout_readLicense);

      // Switch to private
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });

      const privateResponse = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );
      const privatePrivs =
        privateResponse?.data?.lookup?.space?.authorization?.myPrivileges ?? [];

      // Non-member should lose READ access for private space
      expect(privatePrivs.sort()).toEqual(readAboutPrivilege);

      // Restore to public
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test('Member access remains consistent through privacy toggle', async () => {
      // Public mode
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      const publicResponse = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_MEMBER
      );
      const publicPrivs =
        publicResponse?.data?.lookup?.space?.authorization?.myPrivileges?.sort() ??
        [];

      // Switch to private
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });

      const privateResponse = await getPrivateSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_MEMBER
      );
      const privatePrivs =
        privateResponse?.data?.lookup?.space?.authorization?.myPrivileges?.sort() ??
        [];

      // Member should have same privileges in both modes
      expect(publicPrivs).toEqual(sorted_read_readAbout_readLicense_notifications);
      expect(privatePrivs).toEqual(sorted_read_readAbout_readLicense_notifications);

      // Restore to public
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });
  });
});
