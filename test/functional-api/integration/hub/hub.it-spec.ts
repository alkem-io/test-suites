import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
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
const hubIdTwo = '';
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
    expect(response.body.data.createHub.displayName).toEqual(hubName + 'a');

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
    expect(response.body.data.updateHub.displayName).toEqual(hubName + 'b');
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
    const a = await removeHub(hubIdTwo);
    const hubsAfter = await getHubsData();
    const hubsCountAfterRemove = hubsAfter.body.data.hubs;

    // Assert
    expect(hubsCountAfterRemove.length).toEqual(
      hubsCountBeforeRemove.length - 1
    );
  });
});

describe('Hub visibility', () => {
  // There must be no other hubs, in order the suite to work reliably

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
      users.qaUserEmail,
      HubVisibility.ACTIVE
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getuserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.qaUserEmail,
      HubVisibility.ARCHIVED
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.QA_USER);
    const data = hubDataAfterArchive.body.data.hubs[0];

    // Assert
    expect(getuserRoleHubDataAfterArchive.body.data.rolesUser.hubs).toEqual(
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs
    );
    expect(data.visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data.challenges).toEqual(null);
    expect(data.opportunities).toEqual(null);
    expect(data.authorization.myPrivileges).toEqual([]);
  });

  test('HM User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.hubMemberEmail,
      HubVisibility.ACTIVE
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getuserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.hubMemberEmail,
      HubVisibility.ARCHIVED
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.HUB_MEMBER);
    const data = hubDataAfterArchive.body.data.hubs[0];

    // Assert
    expect(getuserRoleHubDataAfterArchive.body.data.rolesUser.hubs).toEqual(
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs
    );
    expect(data.visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data.challenges).toEqual(null);
    expect(data.opportunities).toEqual(null);
    expect(data.authorization.myPrivileges).toEqual([]);
  });

  test('HA User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.hubAdminEmail,
      HubVisibility.ACTIVE
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getuserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.hubAdminEmail,
      HubVisibility.ARCHIVED
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.HUB_ADMIN);
    const data = hubDataAfterArchive.body.data.hubs[0];

    // Assert
    expect(getuserRoleHubDataAfterArchive.body.data.rolesUser.hubs).toEqual(
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs
    );
    expect(data.visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data.challenges).toEqual(null);
    expect(data.opportunities).toEqual(null);
    expect(data.authorization.myPrivileges).toEqual([]);
  });

  test('GA User role to archived Hub', async () => {
    // Arrange
    const getuserRoleHubDataBeforeArchive = await getUserRoleHubsVisibility(
      users.globalAdminId,
      HubVisibility.ACTIVE
    );

    // Act
    await updateHubVisibility(entitiesId.hubId, HubVisibility.ARCHIVED);

    const getuserRoleHubDataAfterArchive = await getUserRoleHubsVisibility(
      users.globalAdminId,
      HubVisibility.ARCHIVED
    );
    const hubDataAfterArchive = await getHubsVisibility(TestUser.GLOBAL_ADMIN);
    const data = hubDataAfterArchive.body.data.hubs[0];

    // Assert
    expect(getuserRoleHubDataAfterArchive.body.data.rolesUser.hubs).toEqual(
      getuserRoleHubDataBeforeArchive.body.data.rolesUser.hubs
    );
    expect(data.visibility).toEqual(HubVisibility.ARCHIVED);
    expect(data.challenges).toHaveLength(1);
    expect(data.opportunities).toHaveLength(1);
    expect(data.authorization.myPrivileges).toEqual([
      'CREATE',
      'GRANT',
      'READ',
      'UPDATE',
      'DELETE',
    ]);
  });
});
