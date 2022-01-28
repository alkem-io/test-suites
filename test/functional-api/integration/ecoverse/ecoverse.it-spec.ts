import { mutation } from '@test/utils/graphql.request';
import {
  updateEcoverse,
  updateEcoverseVariablesData,
} from '@test/utils/mutations/update-mutation';
import '../../../utils/array.matcher';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverse,
} from '../ecoverse/ecoverse.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';

let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

describe('Hub entity', () => {
  test('should create hub', async () => {
    // Act
    let response = await createTestEcoverse(
      ecoverseName + 'a',
      ecoverseNameId + 'a',
      organizationId
    );
    let ecoverseIdTwo = response.body.data.createEcoverse.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createEcoverse.displayName).toEqual(
      ecoverseName + 'a'
    );

    await removeEcoverse(ecoverseIdTwo);
  });

  test('should update hub nameId', async () => {
    // Act

    let response = await mutation(
      updateEcoverse,
      updateEcoverseVariablesData(
        ecoverseId,
        ecoverseName + 'b',
        ecoverseNameId + 'b'
      )
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateEcoverse.displayName).toEqual(
      ecoverseName + 'b'
    );
    expect(response.body.data.updateEcoverse.nameID).toEqual(
      ecoverseNameId + 'b'
    );
  });
  test('should not update hub nameId', async () => {
    // Act

    let response = await createTestEcoverse(
      ecoverseName + 'c',
      ecoverseNameId + 'c',
      organizationId
    );
    let ecoverseIdTwo = response.body.data.createEcoverse.id;
    // Arrange
    let responseUpdate = await mutation(
      updateEcoverse,
      updateEcoverseVariablesData(
        ecoverseId,
        ecoverseName + 'a',
        ecoverseNameId + 'c'
      )
    );

    // Assert
    expect(responseUpdate.text).toContain(
      `Unable to update Ecoverse nameID: the provided nameID is already taken: ${ecoverseNameId +
        'c'}`
    );
    await removeEcoverse(ecoverseIdTwo);
  });
});
