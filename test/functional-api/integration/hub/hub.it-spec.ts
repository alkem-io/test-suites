import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateHub,
  updateHubVariablesData,
} from '@test/utils/mutations/update-mutation';
import '../../../utils/array.matcher';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';

let hubId = '';
let organizationId = '';
let organizationName = 'hub-org-name' + uniqueId;
let hostNameId = 'hub-org-nameid' + uniqueId;
let hubName = 'hub-eco-name' + uniqueId;
let hubNameId = 'hub-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

describe('Hub entity', () => {
  test('should create hub', async () => {
    // Act
    let response = await createTestHub(
      hubName + 'a',
      hubNameId + 'a',
      organizationId
    );
    let hubIdTwo = response.body.data.createHub.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createHub.displayName).toEqual(hubName + 'a');

    await removeHub(hubIdTwo);
  });

  test('should update hub nameId', async () => {
    // Act

    let response = await mutation(
      updateHub,
      updateHubVariablesData(hubId, hubName + 'b', hubNameId + 'b')
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateHub.displayName).toEqual(hubName + 'b');
    expect(response.body.data.updateHub.nameID).toEqual(hubNameId + 'b');
  });
  test('should not update hub nameId', async () => {
    // Act

    let response = await createTestHub(
      hubName + 'c',
      hubNameId + 'c',
      organizationId
    );
    let hubIdTwo = response.body.data.createHub.id;
    // Arrange
    let responseUpdate = await mutation(
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
});
