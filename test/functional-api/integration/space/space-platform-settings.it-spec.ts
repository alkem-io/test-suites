import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import '../../../utils/array.matcher';
import {
  getSpacesVisibility,
  getUserRoleSpacesVisibility,
  SpaceVisibility,
  removeSpace,
  updateSpaceVisibility,
  getSpaceData,
  getSpaceDataCodegen,
  updateSpaceVisibilityCodegen,
  getUserRoleSpacesVisibilityCodegen,
  getSpacesVisibilityCodegen,
} from './space.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import {
  readPrivilege,
  sorted__create_read_update_delete_grant_createChallenge,
  sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin,
} from '@test/non-functional/auth/my-privileges/common';
import {
  SpacePreferenceType,
  changePreferenceSpace,
  changePreferenceSpaceCodegen,
} from '@test/utils/mutations/preferences-mutation';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import { removeChallenge } from '../challenge/challenge.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';

import {
  SpacePreferenceType as SpacePreferenceTypeCodegen,
  SpaceVisibility as SpaceVisibilityCodegen,
  ChallengePreferenceType as ChallengePreferenceTypeCodegen,
} from '@test/generated/alkemio-schema';

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
    await createChallengeWithUsersCodegen(challengeName);
    await createOpportunityWithUsersCodegen(opportunityName);
  });

  afterAll(async () => {
    await removeOpportunity(entitiesId.opportunityId);
    await removeChallenge(entitiesId.challengeId);
    await removeSpace(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organizationId);
  });

  // afterEach(async () => {
  //   // await updateSpaceVisibility(entitiesId.spaceId, {
  //   //   visibility: SpaceVisibility.ACTIVE,
  //   // });
  //   await updateSpaceVisibilityCodegen(
  //     entitiesId.spaceId,
  //     SpaceVisibilityCodegen.Active
  //   );
  // });

  describe('Update space settings - functional', () => {
    beforeAll(async () => {
      const orgData = await createOrganization(
        organizationNameTwo,
        organizationNameTwo
      );
      organizationIdTwo = orgData.body.data.createOrganization.id;
    });

    afterAll(async () => {
      // await updateSpaceVisibility(entitiesId.spaceId, {
      //   visibility: SpaceVisibility.ACTIVE,
      //   nameID: spaceNameId,
      //   hostID: organizationIdTwo,
      // });

      await updateSpaceVisibilityCodegen(
        entitiesId.spaceId,
        SpaceVisibilityCodegen.Active,
        spaceNameId,
        organizationIdTwo
      );

      await deleteOrganization(organizationIdTwo);
    });

    test('Update space settings', async () => {
      // Act
      const updatedSpaceData = await updateSpaceVisibilityCodegen(
        entitiesId.spaceId,
        SpaceVisibilityCodegen.Demo,
        `demo-${uniqueId}`,
        organizationIdTwo
        // {
        //   visibility: SpaceVisibility.DEMO,
        //   nameID: `demo-${uniqueId}`,
        //   hostID: organizationIdTwo,
        // }
      );

      // await updateSpaceVisibilityCodegen(
      //   entitiesId.spaceId,
      //   SpaceVisibilityCodegen.Archived
      // );
      console.log(updatedSpaceData);
      const spaceData = await getSpaceDataCodegen(entitiesId.spaceId);
      const spaceSettings = spaceData?.data?.space;

      // Assert
      expect(updatedSpaceData?.data?.updateSpacePlatformSettings).toEqual(
        spaceSettings
      );
      expect(spaceSettings?.visibility).toEqual(SpaceVisibility.DEMO);
      expect(spaceSettings?.host?.id).toEqual(organizationIdTwo);
      expect(spaceSettings?.nameID).toEqual(`demo-${uniqueId}`);
    });
  });

  describe('Authorization - Update space platform settings', () => {
    beforeAll(async () => {
      // await updateSpaceVisibility(entitiesId.spaceId, {
      //   visibility: SpaceVisibility.ACTIVE,
      // });
      await updateSpaceVisibilityCodegen(
        entitiesId.spaceId,
        SpaceVisibilityCodegen.Active
      );
    });
    describe('DDT role access to private Space', () => {
      // Arrange
      test.only.each`
        user                               | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin}
        ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin}
        ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
        ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createChallenge}
        ${TestUser.HUB_MEMBER}             | ${readPrivilege}
        ${TestUser.NON_HUB_MEMBER}         | ${[]}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
          console.log(request?.error?.errors);
          console.log(request?.data);
          const result = request?.data?.space;
          console.log(result);

          console.log(result?.authorization);

          console.log(result?.authorization?.myPrivileges);
          console.log(result?.authorization?.myPrivileges?.sort());

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
        await updateSpaceVisibilityCodegen(
          entitiesId.spaceId,
          SpaceVisibilityCodegen.Active
        );

        await changePreferenceSpaceCodegen(
          entitiesId.spaceId,
          SpacePreferenceTypeCodegen.AuthorizationAnonymousReadAccess,
          'true'
        );
      });

      test.each`
        user                               | spaceMyPrivileges
        ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin}
        ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin}
        ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
        ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createChallenge}
        ${TestUser.HUB_MEMBER}             | ${readPrivilege}
        ${TestUser.NON_HUB_MEMBER}         | ${readPrivilege}
      `(
        'User: "$user", should have private Space privileges: "$spaceMyPrivileges"',
        async ({ user, spaceMyPrivileges }) => {
          const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
          const result = request?.data?.space;

          // Assert

          expect(result?.authorization?.myPrivileges?.sort()).toEqual(
            spaceMyPrivileges
          );
        }
      );
    });
  });

  describe('DDT role WITH access to public archived Space', () => {
    // Arrange
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceTypeCodegen.AuthorizationAnonymousReadAccess,
        'true'
      );
    });

    test.each`
      user                               | email                         | communicationMyPrivileges                                                                   | challengesCount | opportunitiesCount
      ${TestUser.GLOBAL_ADMIN}           | ${'admin@alkem.io'}           | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin} | ${1}            | ${1}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${'global.spaces@alkem.io'}   | ${sorted__create_read_update_delete_grant_authorizationReset_createChallenge_platformAdmin} | ${1}            | ${1}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${'community.admin@alkem.io'} | ${readPrivilege}                                                                            | ${1}            | ${1}
    `(
      'User role: "$user", have access to public archived Space',
      async ({
        user,
        email,
        communicationMyPrivileges,
        challengesCount,
        opportunitiesCount,
      }) => {
        // Arrange
        const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibilityCodegen.Archived
        );
        const beforeVisibilityChangeAllSpaces =
          getuserRoleSpaceDataBeforeArchive?.data?.rolesUser.spaces;
        const dataBeforeVisibilityChange = beforeVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        // Act
        // await updateSpaceVisibility(entitiesId.spaceId, {
        //   visibility: SpaceVisibility.ARCHIVED,
        // });
        // await updateSpaceVisibility(entitiesId.spaceId, {
        //   visibility: SpaceVisibility.ACTIVE,
        // });
        await updateSpaceVisibilityCodegen(
          entitiesId.spaceId,
          SpaceVisibilityCodegen.Archived
        );

        const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibilityCodegen(
          email,
          SpaceVisibilityCodegen.Archived
        );

        const afterVisibilityChangeAllSpaces =
          getUserRoleSpaceDataAfterArchive?.data?.rolesUser?.spaces;
        const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces?.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        const spaceDataAfterArchive = await getSpacesVisibilityCodegen(
          entitiesId.spaceId,
          // [SpaceVisibilityCodegen.Archived,],
          user
        );
        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });
        console.log(data);

        // Assert
        expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
        expect(data?.[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
        expect(data?.[0].challenges).toHaveLength(challengesCount);
        expect(data?.[0].opportunities).toHaveLength(opportunitiesCount);
        expect(data?.[0].authorization?.myPrivileges?.sort()).toEqual(
          communicationMyPrivileges
        );
      }
    );
  });

  describe('DDT role WITHOUT access to public archived Space', () => {
    // Arrange
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceTypeCodegen.AuthorizationAnonymousReadAccess,
        'true'
      );
    });

    test.each`
      user                       | email                      | communicationMyPrivileges | challengesCount | opportunitiesCount
      ${TestUser.HUB_ADMIN}      | ${'space.admin@alkem.io'}  | ${[]}                     | ${null}         | ${null}
      ${TestUser.HUB_MEMBER}     | ${'space.member@alkem.io'} | ${[]}                     | ${null}         | ${null}
      ${TestUser.NON_HUB_MEMBER} | ${'non.space@alkem.io'}    | ${[]}                     | ${null}         | ${null}
    `(
      'User role: "$user", have NO access to public archived Space',
      async ({
        user,
        email,
        communicationMyPrivileges,
        challengesCount,
        opportunitiesCount,
      }) => {
        const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibility(
          email,
          SpaceVisibility.ACTIVE
        );
        const beforeVisibilityChangeAllSpaces =
          getuserRoleSpaceDataBeforeArchive.body.data.rolesUser.spaces;
        const dataBeforeVisibilityChange = beforeVisibilityChangeAllSpaces.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        // Act
        // await updateSpaceVisibility(entitiesId.spaceId, {
        //   visibility: SpaceVisibility.ARCHIVED,
        // });
        await updateSpaceVisibilityCodegen(
          entitiesId.spaceId,
          SpaceVisibilityCodegen.Archived
        );

        const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibility(
          email,
          SpaceVisibility.ARCHIVED
        );

        const afterVisibilityChangeAllSpaces =
          getUserRoleSpaceDataAfterArchive.body.data.rolesUser.spaces;
        const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces.filter(
          (obj: { nameID: string }) => {
            return obj.nameID.includes(spaceNameId);
          }
        );

        const spaceDataAfterArchive = await getSpacesVisibilityCodegen(
          entitiesId.spaceId,
          //SpaceVisibilityCodegen.Archived,
          user
        );
        const allSpaces = spaceDataAfterArchive?.data?.spaces;
        const data = allSpaces?.filter((obj: { nameID: string }) => {
          return obj.nameID.includes(spaceNameId);
        });

        // Assert
        expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
        expect(data?.[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
        expect(data?.[0].challenges).toEqual(challengesCount);
        expect(data?.[0].opportunities).toEqual(opportunitiesCount);
        expect(data?.[0].authorization?.myPrivileges?.sort()).toEqual(
          communicationMyPrivileges
        );
      }
    );
  });
});
