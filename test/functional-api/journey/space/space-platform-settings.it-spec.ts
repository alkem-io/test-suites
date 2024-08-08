import { TestUser } from '@test/utils';
import '../../../utils/array.matcher';
import {
  getSpaceDataCodegen,
  getUserRoleSpacesVisibilityCodegen,
  getPrivateSpaceDataCodegen,
  getSpacesFilteredByVisibilityWithAccessCodegen,
  getSpacesFilteredByVisibilityNoAccessCodegen,
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
  updateSpacePlatformCodegen,
} from './space.request.params';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import {
  readPrivilege,
  sorted__create_read_update_delete_grant_createSubspace,
  sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin,
  sorted__create_read_update_delete_grant_createSubspace_platformAdmin,
} from '@test/non-functional/auth/my-privileges/common';
import { deleteOpportunityCodegen } from '../opportunity/opportunity.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import {
  SpacePrivacyMode,
  SpaceVisibility,
} from '@test/generated/alkemio-schema';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

const organizationName = 'space-org-name' + uniqueId;
const hostNameId = 'space-org-nameid' + uniqueId;
const spaceName = 'space-name' + uniqueId;
const spaceNameId = 'space-nameid' + uniqueId;
const opportunityName = 'space-opp';
const challengeName = 'space-chal';
let organizationIdTwo = '';
const organizationNameTwo = 'org2' + uniqueId;

describe('Update space platform settings', () => {
  beforeAll(async () => {
    await createOrgAndSpaceWithUsersCodegen(
      organizationName,
      hostNameId,
      spaceName,
      spaceNameId
    );
    await updateSpaceSettingsCodegen(entitiesId.spaceId, {
      privacy: { mode: SpacePrivacyMode.Private },
    });
    await createChallengeWithUsersCodegen(challengeName);
    await createOpportunityWithUsersCodegen(opportunityName);
  });

  afterAll(async () => {
    await deleteOpportunityCodegen(entitiesId.opportunityId);
    await deleteSpaceCodegen(entitiesId.challengeId);
    await deleteSpaceCodegen(entitiesId.spaceId);
    await deleteOrganizationCodegen(entitiesId.organizationId);
    await deleteOrganizationCodegen(organizationIdTwo);
  });

  describe('Update space settings - functional', () => {
    beforeAll(async () => {
      const orgData = await createOrganizationCodegen(
        organizationNameTwo,
        organizationNameTwo
      );
      organizationIdTwo = orgData?.data?.createOrganization.id ?? '';
    });

    afterAll(async () => {
      await updateSpacePlatformCodegen(
        entitiesId.spaceId,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    test('Update space settings', async () => {
      // Act
      await updateSpacePlatformCodegen(
        entitiesId.spaceId,
        spaceNameId,
        SpaceVisibility.Demo
      );

      const spaceData = await getSpaceDataCodegen(entitiesId.spaceId);
      const spaceSettings = spaceData?.data?.space;

      // Assert

      expect(spaceSettings?.visibility).toEqual(SpaceVisibility.Demo);
      expect(spaceSettings?.account.host?.id).toEqual(organizationIdTwo);
    });
  });

  describe('Authorization - Update space platform settings', () => {
    beforeAll(async () => {
      await updateSpacePlatformCodegen(
        entitiesId.spaceId,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    describe('DDT role access to private Space', () => {
      // Arrange
      test.each`
        user                               | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createSubspace_platformAdmin}
        ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createSubspace_platformAdmin}
        ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${[]}
        ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createSubspace}
        ${TestUser.HUB_MEMBER}             | ${readPrivilege}
        ${TestUser.NON_HUB_MEMBER}         | ${[]}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getPrivateSpaceDataCodegen(
            entitiesId.spaceId,
            user
          );
          const result = request?.data?.space;

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
        await updateSpacePlatformCodegen(
          entitiesId.spaceId,
          spaceNameId,
          SpaceVisibility.Active
        );

        await updateSpaceSettingsCodegen(entitiesId.spaceId, {
          privacy: { mode: SpacePrivacyMode.Public },
        });
      });

      test.each`
        user                               | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createSubspace_platformAdmin}
        ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createSubspace_platformAdmin}
        ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
        ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createSubspace}
        ${TestUser.HUB_MEMBER}             | ${readPrivilege}
        ${TestUser.NON_HUB_MEMBER}         | ${readPrivilege}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getPrivateSpaceDataCodegen(
            entitiesId.spaceId,
            user
          );
          const result = request?.data?.space;

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
      await updateSpacePlatformCodegen(
        entitiesId.spaceId,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    beforeAll(async () => {
      await updateSpaceSettingsCodegen(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                               | email                         | communicationMyPrivileges                                                                  | challengesCount | opportunitiesCount
      ${TestUser.GLOBAL_ADMIN}           | ${'admin@alkem.io'}           | ${sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin} | ${1}            | ${1}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${'global.spaces@alkem.io'}   | ${sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin} | ${1}            | ${1}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${'community.admin@alkem.io'} | ${readPrivilege}                                                                           | ${1}            | ${1}
    `(
      'User role: "$user", have access to public archived Space',
      async ({ user, email, communicationMyPrivileges, challengesCount }) => {
        // Arrange
        const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibility.Active
        );
        const beforeVisibilityChangeAllSpaces =
          getuserRoleSpaceDataBeforeArchive?.data?.rolesUser.spaces;
        const dataBeforeVisibilityChange = beforeVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );
        await updateSpacePlatformCodegen(
          entitiesId.spaceId,
          spaceNameId,
          SpaceVisibility.Archived
        );

        const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibility.Archived
        );

        const afterVisibilityChangeAllSpaces =
          getUserRoleSpaceDataAfterArchive?.data?.rolesUser?.spaces;
        const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        const spaceDataAfterArchive = await getSpacesFilteredByVisibilityWithAccessCodegen(
          entitiesId.spaceId,
          user
        );
        console.log('spaceDataAfterArchive', spaceDataAfterArchive);
        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });

        // Assert
        //expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
        expect(data?.[0].visibility).toEqual(SpaceVisibility.Archived);
        expect(data?.[0].subspaces).toHaveLength(challengesCount);
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
      await updateSpacePlatformCodegen(
        entitiesId.spaceId,
        spaceNameId,
        SpaceVisibility.Active
      );
    });

    beforeAll(async () => {
      await updateSpaceSettingsCodegen(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Public },
      });
    });

    test.each`
      user                       | email                      | communicationMyPrivileges | challengesCount | opportunitiesCount
      ${TestUser.HUB_ADMIN}      | ${'space.admin@alkem.io'}  | ${[]}                     | ${null}         | ${null}
      ${TestUser.HUB_MEMBER}     | ${'space.member@alkem.io'} | ${[]}                     | ${null}         | ${null}
      ${TestUser.NON_HUB_MEMBER} | ${'non.space@alkem.io'}    | ${[]}                     | ${null}         | ${null}
    `(
      'User role: "$user", have NO access to public archived Space',
      async ({ user, email, communicationMyPrivileges }) => {
        const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibility.Active
        );
        const beforeVisibilityChangeAllSpaces =
          getuserRoleSpaceDataBeforeArchive?.data?.rolesUser.spaces;
        const dataBeforeVisibilityChange = beforeVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        // Act
        await updateSpacePlatformCodegen(
          entitiesId.spaceId,
          spaceNameId,
          SpaceVisibility.Archived
        );

        const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibility.Archived
        );
        console.log(
          'getUserRoleSpaceDataAfterArchive',
          getUserRoleSpaceDataAfterArchive.error
        );
        const afterVisibilityChangeAllSpaces =
          getUserRoleSpaceDataAfterArchive?.data?.rolesUser.spaces;
        const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        const spaceDataAfterArchive = await getSpacesFilteredByVisibilityNoAccessCodegen(
          entitiesId.spaceId,
          user
        );

        console.log(
          'spaceDataAfterArchive',
          spaceDataAfterArchive.error?.errors
        );
        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        console.log('allSpaces', allSpaces);
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });
        console.log(data);
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
