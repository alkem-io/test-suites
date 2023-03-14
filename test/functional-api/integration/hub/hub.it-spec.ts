import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
  createOrgAndHubWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateHub,
  updateHubVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import '../../../utils/array.matcher';
import { removeChallenge } from '../challenge/challenge.request.params';
import {
  createTestHub,
  getHubsData,
  getHubsVisibility,
  getUserRoleHubsVisibility,
  HubVisibility,
  removeHub,
  updateHubVisibility,
} from '../hub/hub.request.params';
import { removeOpportunity } from '../opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';

let hubId = '';
let organizationId = '';
const organizationName = 'hub-org-name' + uniqueId;
const hostNameId = 'hub-org-nameid' + uniqueId;
const hubName = 'hub-name' + uniqueId;
const hubNameId = 'hub-nameid' + uniqueId;
const opportunityName = 'hub-opp';
const challengeName = 'hub-chal';
describe('Hub entity', () => {
  beforeAll(async () => {
    const responseOrg = await createOrganization(organizationName, hostNameId);
    organizationId = responseOrg.body.data.createOrganization.id;
    const responseEco = await createTestHub(hubName, hubNameId, organizationId);
    hubId = responseEco.body.data.createHub.id;
  });

  afterAll(async () => {
    await removeHub(hubId);
    await deleteOrganization(organizationId);
  });

  test('should create hub', async () => {
    // Act
    const response = await createTestHub(
      hubName + 'a',
      hubNameId + 'a',
      organizationId
    );
    const hubIdTwo = response.body.data.createHub.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createHub.profile.displayName).toEqual(
      hubName + 'a'
    );

    await removeHub(hubIdTwo);
  });

  test('should update hub nameId', async () => {
    // Act

    const response = await mutation(
      updateHub,
      updateHubVariablesData(hubId, hubName + 'b', hubNameId + 'b')
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateHub.profile.displayName).toEqual(
      hubName + 'b'
    );
    expect(response.body.data.updateHub.nameID).toEqual(hubNameId + 'b');
  });

  test('should not update hub nameId', async () => {
    // Arrange

    const response = await createTestHub(
      hubName + 'c',
      hubNameId + 'c',
      organizationId
    );
    const hubIdTwo = response.body.data.createHub.id;

    // Act
    const responseUpdate = await mutation(
      updateHub,
      updateHubVariablesData(hubId, hubName + 'a', hubNameId + 'c')
    );

    // Assert
    expect(responseUpdate.text).toContain(
      `Unable to update Hub nameID: the provided nameID is already taken: ${hubNameId +
        'c'}`
    );
    await removeHub(hubIdTwo);
  });

  test('should remove hub', async () => {
    // Arrange

    const response = await createTestHub(
      hubName + 'c',
      hubNameId + 'c',
      organizationId
    );
    const hubIdTwo = response.body.data.createHub.id;
    const hubs = await getHubsData();
    const hubsCountBeforeRemove = hubs.body.data.hubs;

    // Act
    await removeHub(hubIdTwo);
    const hubsAfter = await getHubsData();
    const hubsCountAfterRemove = hubsAfter.body.data.hubs;

    // Assert
    expect(hubsCountAfterRemove.length).toEqual(
      hubsCountBeforeRemove.length - 1
    );
  });
});

describe('Hub visibility', () => {
  beforeAll(async () => {
    await createOrgAndHubWithUsers(
      organizationName,
      hostNameId,
      hubName,
      hubNameId
    );
    await createChallengeWithUsers(challengeName);
    await createOpportunityWithUsers(opportunityName);
  });

  afterAll(async () => {
    await removeOpportunity(entitiesId.opportunityId);
    await removeChallenge(entitiesId.challengeId);
    await removeHub(entitiesId.hubId);
    await deleteOrganization(entitiesId.organizationId);
  });

  afterEach(async () => {
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ACTIVE);
  });

  test('OM User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.opportunityMemberEmail,
      HubVisibility.ACTIVE
    );
    const beforeVisibilityChangeAllHubs =
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs;
    const dataBeforeVisibilityChange = beforeVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getUserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.opportunityMemberEmail,
      HubVisibility.ARCHIVED
    );

    const afterVisibilityChangeAllHubs =
      getUserRoleHubDataAfterArchive.body.data.rolesUser.hubs;
    const dataAfterVisibilityChange = afterVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );

    const hubDataAfterArchive = await getHubsVisibility(
      TestUser.OPPORTUNITY_MEMBER
    );
    const allHubs = hubDataAfterArchive.body.data.hubs;
    const data = allHubs.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(hubNameId);
    });

    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('HM User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.hubMemberEmail,
      HubVisibility.ACTIVE
    );
    const beforeVisibilityChangeAllHubs =
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs;
    const dataBeforeVisibilityChange = beforeVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getUserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.hubMemberEmail,
      HubVisibility.ARCHIVED
    );

    const afterVisibilityChangeAllHubs =
      getUserRoleHubDataAfterArchive.body.data.rolesUser.hubs;
    const dataAfterVisibilityChange = afterVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.HUB_MEMBER);
    //const data = hubDataAfterArchive.body.data.hubs[0];
    const allHubs = hubDataAfterArchive.body.data.hubs;
    const data = allHubs.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(hubNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('HA User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.hubAdminEmail,
      HubVisibility.ACTIVE
    );
    const beforeVisibilityChangeAllHubs =
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs;
    const dataBeforeVisibilityChange = beforeVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );
    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getUserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.hubAdminEmail,
      HubVisibility.ARCHIVED
    );
    const afterVisibilityChangeAllHubs =
      getUserRoleHubDataAfterArchive.body.data.rolesUser.hubs;
    const dataAfterVisibilityChange = afterVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.HUB_ADMIN);
    const allHubs = hubDataAfterArchive.body.data.hubs;
    const data = allHubs.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(hubNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data[0].challenges).toEqual(null);
    expect(data[0].opportunities).toEqual(null);
    expect(data[0].authorization.myPrivileges).toEqual([]);
  });

  test('GA User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.globalHubsAdminId,
      HubVisibility.ACTIVE
    );

    const beforeVisibilityChangeAllHubs =
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs;
    const dataBeforeVisibilityChange = beforeVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getUserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.globalHubsAdminId,
      HubVisibility.ARCHIVED
    );
    const afterVisibilityChangeAllHubs =
      getUserRoleHubDataAfterArchive.body.data.rolesUser.hubs;
    const dataAfterVisibilityChange = afterVisibilityChangeAllHubs.filter(
      (obj: { nameID: string }) => {
        return obj.nameID.includes(hubNameId);
      }
    );
    const hubDataAfterArchive = await getHubsVisibility(
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const allHubs = hubDataAfterArchive.body.data.hubs;

    const data = allHubs.filter((obj: { nameID: string }) => {
      return obj.nameID.includes(hubNameId);
    });
    // Assert
    expect(dataBeforeVisibilityChange).toEqual(dataAfterVisibilityChange);
    expect(data[0].visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data[0].challenges).toHaveLength(1);
    expect(data[0].opportunities).toHaveLength(1);
    expect(data[0].authorization.myPrivileges).toEqual([
      'CREATE',
      'READ',
      'UPDATE',
      'DELETE',
      'AUTHORIZATION_RESET',
      'GRANT',
      'CREATE_CHALLENGE',
    ]);
  });
});
