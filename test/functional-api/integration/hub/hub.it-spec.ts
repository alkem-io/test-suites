import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateHub,
  updateHubVariablesData,
} from '@test/utils/mutations/update-mutation';
import '../../../utils/array.matcher';
import {
  createTestHub,
  getHubsData,
  removeHub,
} from '../hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';

let hubId = '';
let organizationId = '';
const organizationName = 'hub-org-name' + uniqueId;
const hostNameId = 'hub-org-nameid' + uniqueId;
const hubName = 'hub-eco-name' + uniqueId;
const hubNameId = 'hub-eco-nameid' + uniqueId;

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

describe('Hub entity', () => {
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
