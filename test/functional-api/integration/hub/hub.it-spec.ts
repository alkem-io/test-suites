import { mutation } from '@test/utils/graphql.request';
import {
  updateEcoverse,
  updateEcoverseVariablesData,
} from '@test/utils/mutations/update-mutation';
import '../../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  removeEcoverse,
} from '../hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';

let hubId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    organizationId
  );
  hubId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverse(hubId);
  await deleteOrganization(organizationId);
});

describe('Hub entity', () => {
  test('should create hub', async () => {
    // Act
    let response = await createTestEcoverse(
      hubName + 'a',
      hubNameId + 'a',
      organizationId
    );
    let hubIdTwo = response.body.data.createEcoverse.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createEcoverse.displayName).toEqual(
      hubName + 'a'
    );

    await removeEcoverse(hubIdTwo);
  });

  test('should update hub nameId', async () => {
    // Act

    let response = await mutation(
      updateEcoverse,
      updateEcoverseVariablesData(hubId, hubName + 'b', hubNameId + 'b')
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateEcoverse.displayName).toEqual(
      hubName + 'b'
    );
    expect(response.body.data.updateEcoverse.nameID).toEqual(hubNameId + 'b');
  });
  test('should not update hub nameId', async () => {
    // Act

    let response = await createTestEcoverse(
      hubName + 'c',
      hubNameId + 'c',
      organizationId
    );
    let hubIdTwo = response.body.data.createEcoverse.id;
    // Arrange
    let responseUpdate = await mutation(
      updateEcoverse,
      updateEcoverseVariablesData(hubId, hubName + 'a', hubNameId + 'c')
    );

    // Assert
    expect(responseUpdate.text).toContain(
      `Unable to update Ecoverse nameID: the provided nameID is already taken: ${hubNameId +
        'c'}`
    );
    await removeEcoverse(hubIdTwo);
  });
});
