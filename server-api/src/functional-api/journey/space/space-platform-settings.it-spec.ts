import {
  readAboutPrivilege,
  readAboutPrivilege_readLicense,
  readPrivilege,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense,
  sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense,
  sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin,
  sorted_read_readAbout_readLicense,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  getSpaceData,
  getUserRoleSpacesVisibility,
  getPrivateSpaceData,
  getSpacesFilteredByVisibilityWithAccess,
  getSpacesFilteredByVisibilityNoAccess,
  updateSpaceSettings,
  updateSpacePlatformSettings,
} from './space.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/dist/scenario/models/OrganizationWithSpaceModel';
import { SpacePrivacyMode, SpaceVisibility } from '@alkemio/client-lib';

const uniqueId = UniqueIDGenerator.getID();

const spaceNameId = 'space-nameid' + uniqueId;
let organizationIdTwo = '';

const organizationNameTwo = 'org2' + uniqueId;

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'space-platform-settings',
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
      },
    },
  },
};

describe('Update space platform settings', () => {
  beforeAll(async () => {
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
    await deleteOrganization(organizationIdTwo);
  });

  // Previously this was testing different host (account) for the space, to be updated after we have such mutation
  describe('Update space settings - functional', () => {
    beforeAll(async () => {
      const orgData = await createOrganization(
        organizationNameTwo,
        organizationNameTwo
      );
      organizationIdTwo = orgData?.data?.createOrganization.id ?? '';
    });

    afterAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    // Previously this was testing different host (account) for the space, to be updated after we have such mutation
    test('Update space settings', async () => {
      // Act
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        spaceNameId,
        SpaceVisibility.Demo
      );

      const spaceData = await getSpaceData(baseScenario.space.id);
      const spaceSettings = spaceData?.data?.lookup?.space;

      // Assert

      expect(spaceSettings?.visibility).toEqual(SpaceVisibility.Demo);
      expect(spaceSettings?.account.host?.id).toEqual(
        baseScenario.organization.id
      );
    });
  });

  describe('Authorization - Update space platform settings', () => {
    beforeAll(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    describe('DDT role access to private Space', () => {
      // Arrange
      test.each`
        user                             | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense}
        ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense}
        ${TestUser.GLOBAL_LICENSE_ADMIN} | ${readAboutPrivilege_readLicense}
        ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense}
        ${TestUser.SPACE_MEMBER}         | ${sorted_read_readAbout_readLicense}
        ${TestUser.NON_SPACE_MEMBER}     | ${readAboutPrivilege}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getPrivateSpaceData(
            baseScenario.space.id,
            user
          );
          const result = request?.data?.lookup?.space;

          // Assert
          expect(result?.authorization?.myPrivileges?.sort()).toEqual(
            spaceMyPrivileges
          );
        }
      );
    });

    describe('DDT role access to public Space', () => {
      // Arrange
      beforeAll(async () => {
        await updateSpacePlatformSettings(
          baseScenario.space.id,
          spaceNameId,
          SpaceVisibility.Active
        );

        await updateSpaceSettings(baseScenario.space.id, {
          privacy: { mode: SpacePrivacyMode.Public },
        });
      });

      test.each`
        user                             | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense}
        ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_platformAdmin_readLicense}
        ${TestUser.GLOBAL_LICENSE_ADMIN} | ${sorted_read_readAbout_readLicense}
        ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_readAbout_update_delete_grant_createSubspace_readLicense}
        ${TestUser.SPACE_MEMBER}         | ${sorted_read_readAbout_readLicense}
        ${TestUser.NON_SPACE_MEMBER}     | ${sorted_read_readAbout_readLicense}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getPrivateSpaceData(
            baseScenario.space.id,
            user
          );
          const result = request?.data?.lookup?.space;

          // Assert
          expect(result?.authorization?.myPrivileges?.sort()).toEqual(
            spaceMyPrivileges
          );
        }
      );
    });
  });

  // ToDo remove skipped tests
  describe.skip('DDT role WITH access to public archived Space', () => {
    // Arrange
    beforeEach(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                             | communicationMyPrivileges                                                                  | subspacesCount | opportunitiesCount
      ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin} | ${1}           | ${1}
      ${TestUser.GLOBAL_LICENSE_ADMIN} | ${sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin} | ${1}           | ${1}
      ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${readPrivilege}                                                                           | ${1}           | ${1}
    `(
      'User role: "$user", have access to public archived Space',
      async ({ user, communicationMyPrivileges, subspacesCount }) => {
        // Arrange
        const userModel = TestUserManager.getUserModelByType(user);
        const getUserRoleSpaceDataBeforeArchive =
          await getUserRoleSpacesVisibility(
            userModel.id,
            SpaceVisibility.Active
          );
        const beforeVisibilityChangeAllSpaces =
          getUserRoleSpaceDataBeforeArchive?.data?.rolesUser.spaces;
        beforeVisibilityChangeAllSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });
        await updateSpacePlatformSettings(
          baseScenario.space.id,
          spaceNameId,
          SpaceVisibility.Archived
        );

        const spaceDataAfterArchive =
          await getSpacesFilteredByVisibilityWithAccess(
            baseScenario.space.id,
            user
          );
        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });

        // Assert
        //expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
        expect(data?.[0].visibility).toEqual(SpaceVisibility.Archived);
        expect(data?.[0].subspaces).toHaveLength(subspacesCount);
        expect(data?.[0].authorization?.myPrivileges?.sort()).toEqual(
          communicationMyPrivileges
        );
      }
    );
  });

  // ToDo remove skipped tests
  describe.skip('DDT role WITHOUT access to public archived Space', () => {
    // Arrange
    beforeEach(async () => {
      await updateSpacePlatformSettings(
        baseScenario.space.id,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    beforeAll(async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                         | communicationMyPrivileges | subspacesCount | opportunitiesCount
      ${TestUser.SPACE_ADMIN}      | ${[]}                     | ${null}        | ${null}
      ${TestUser.SPACE_MEMBER}     | ${[]}                     | ${null}        | ${null}
      ${TestUser.NON_SPACE_MEMBER} | ${[]}                     | ${null}        | ${null}
    `(
      'User role: "$user", have NO access to public archived Space',
      async ({ user, communicationMyPrivileges }) => {
        // Act
        await updateSpacePlatformSettings(
          baseScenario.space.id,
          spaceNameId,
          SpaceVisibility.Archived
        );

        const spaceDataAfterArchive =
          await getSpacesFilteredByVisibilityNoAccess(
            baseScenario.space.id,
            user
          );

        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });
        // Assert
        //expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
        expect(data?.[0].visibility).toEqual(SpaceVisibility.Archived);
        expect(data?.[0].authorization?.myPrivileges?.sort()).toEqual(
          communicationMyPrivileges
        );
      }
    );
  });
});
