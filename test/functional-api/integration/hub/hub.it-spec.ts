import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndSpaceWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateSpace,
  updateSpaceVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import '../../../utils/array.matcher';
import { removeChallenge } from '../challenge/challenge.request.params';
import {
  createTestSpace,
  getSpacesData,
  getSpacesVisibility,
  getUserRoleSpacesVisibility,
  SpaceVisibility,
  removeSpace,
  updateSpaceVisibility,
} from '../space/space.request.params';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { sorted__create_read_update_delete_grant_authorizationReset_createChallenge } from '@test/non-functional/auth/my-privileges/common';

let spaceId = '';
let organizationId = '';
const organizationName = 'space-org-name' + uniqueId;
const hostNameId = 'space-org-nameid' + uniqueId;
const spaceName = 'space-name' + uniqueId;
const spaceNameId = 'space-nameid' + uniqueId;
const opportunityName = 'space-opp';
const challengeName = 'space-chal';
describe('Space entity', () => {
  beforeAll(async () => {
    const responseOrg = await createOrganization(organizationName, hostNameId);
    organizationId = responseOrg.body.data.createOrganization.id;
    const responseEco = await createTestSpace(
      spaceName,
      spaceNameId,
      organizationId
    );
    spaceId = responseEco.body.data.createSpace.id;
  });

  afterAll(async () => {
    await removeSpace(spaceId);
    await deleteOrganization(organizationId);
  });

  test('should create space', async () => {
    // Act
    const response = await createTestSpace(
      spaceName + 'a',
      spaceNameId + 'a',
      organizationId
    );
    const spaceIdTwo = response.body.data.createSpace.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createSpace.profile.displayName).toEqual(
      spaceName + 'a'
    );

    await removeSpace(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act

    const response = await mutation(
      updateSpace,
      updateSpaceVariablesData(spaceId, spaceName + 'b', spaceNameId + 'b')
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateSpace.profile.displayName).toEqual(
      spaceName + 'b'
    );
    expect(response.body.data.updateSpace.nameID).toEqual(spaceNameId + 'b');
  });

  test('should not update space nameId', async () => {
    // Arrange

    const response = await createTestSpace(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response.body.data.createSpace.id;

    // Act
    const responseUpdate = await mutation(
      updateSpace,
      updateSpaceVariablesData(spaceId, spaceName + 'a', spaceNameId + 'c')
    );

    // Assert
    expect(responseUpdate.text).toContain(
      `Unable to update Space nameID: the provided nameID is already taken: ${spaceNameId +
        'c'}`
    );
    await removeSpace(spaceIdTwo);
  });

  test('should remove space', async () => {
    // Arrange

    const response = await createTestSpace(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response.body.data.createSpace.id;
    const spaces = await getSpacesData();
    const spacesCountBeforeRemove = spaces.body.data.spaces;

    // Act
    await removeSpace(spaceIdTwo);
    const spacesAfter = await getSpacesData();
    const spacesCountAfterRemove = spacesAfter.body.data.spaces;

    // Assert
    expect(spacesCountAfterRemove.length).toEqual(
      spacesCountBeforeRemove.length - 1
    );
  });
});

// To be updated
describe.skip('Space visibility', () => {
  beforeAll(async () => {
    await createOrgAndSpaceWithUsers(
      organizationName,
      hostNameId,
      spaceName,
      spaceNameId
    );
    await createChallengeWithUsers(challengeName);
    await createOpportunityWithUsers(opportunityName);
  });

  afterAll(async () => {
    await removeOpportunity(entitiesId.opportunityId);
    await removeChallenge(entitiesId.challengeId);
    await removeSpace(entitiesId.spaceId);
    await deleteOrganization(entitiesId.organizationId);
  });

  afterEach(async () => {
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.ACTIVE);
  });

  test('OM User role to archived Space', async () => {
    // Arrange
    const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibility(
      users.opportunityMemberEmail,
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
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.ARCHIVED);

    const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibility(
      users.opportunityMemberEmail,
      SpaceVisibility.ARCHIVED
    );

    const afterVisibilityChangeAllSpaces =
      getUserRoleSpaceDataAfterArchive.body.data.rolesUser.spaces;
    const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(spaceNameId);
      }
    );

    const spaceDataAfterArchive = await getSpacesVisibility(
      TestUser.OPPORTUNITY_MEMBER
    );
    const allSpaces = spaceDataAfterArchive.body.data.spaces;
    const data = allSpaces.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(spaceNameId);
    });

    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('HM User role to archived Space', async () => {
    // Arrange
    const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibility(
      users.spaceMemberEmail,
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
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.ARCHIVED);

    const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibility(
      users.spaceMemberEmail,
      SpaceVisibility.ARCHIVED
    );

    const afterVisibilityChangeAllSpaces =
      getUserRoleSpaceDataAfterArchive.body.data.rolesUser.spaces;
    const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(spaceNameId);
      }
    );
    const spaceDataAfterArchive = await getSpacesVisibility(
      TestUser.HUB_MEMBER
    );
    //const data = spaceDataAfterArchive.body.data.spaces[0];
    const allSpaces = spaceDataAfterArchive.body.data.spaces;
    const data = allSpaces.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(spaceNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('HA User role to archived Space', async () => {
    // Arrange
    const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibility(
      users.spaceAdminEmail,
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
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.ARCHIVED);

    const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibility(
      users.spaceAdminEmail,
      SpaceVisibility.ARCHIVED
    );
    const afterVisibilityChangeAllSpaces =
      getUserRoleSpaceDataAfterArchive.body.data.rolesUser.spaces;
    const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(spaceNameId);
      }
    );
    const spaceDataAfterArchive = await getSpacesVisibility(TestUser.HUB_ADMIN);
    const allSpaces = spaceDataAfterArchive.body.data.spaces;
    const data = allSpaces.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(spaceNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('GA User role to archived Space', async () => {
    // Arrange
    const getuserRoleSpaceDataBeforeArchive = await getUserRoleSpacesVisibility(
      users.globalSpacesAdminId,
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
    await updateSpaceVisibility(entitiesId.spaceId, SpaceVisibility.ARCHIVED);

    const getUserRoleSpaceDataAfterArchive = await getUserRoleSpacesVisibility(
      users.globalSpacesAdminId,
      SpaceVisibility.ARCHIVED
    );
    const afterVisibilityChangeAllSpaces =
      getUserRoleSpaceDataAfterArchive.body.data.rolesUser.spaces;
    const dataAfterVisibilityChange = afterVisibilityChangeAllSpaces.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(spaceNameId);
      }
    );
    const spaceDataAfterArchive = await getSpacesVisibility(
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const allSpaces = spaceDataAfterArchive.body.data.spaces;

    const data = allSpaces.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(spaceNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(SpaceVisibility.ARCHIVED);
    expect(data[0].challenges).toHaveLength(1);
    expect(data[0].opportunities).toHaveLength(1);
    expect(data[0].authorization.myPrivileges.sort()).toEqual(
      sorted__create_read_update_delete_grant_authorizationReset_createChallenge
    );
  });
});
