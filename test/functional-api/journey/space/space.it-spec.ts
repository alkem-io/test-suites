import '../../../utils/array.matcher';
import {
  createSpaceAndGetData,
  deleteSpaceCodegen,
  getSpacesDataCodegen,
  updateSpacePlatformCodegen,
} from './space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let spaceId = '';
let organizationId = '';
const organizationName = 'space-org-name' + uniqueId;
const hostNameId = 'space-org-nameid' + uniqueId;
const spaceName = 'space-nam' + uniqueId;
const spaceNameId = 'space-namei' + uniqueId;

describe('Space entity', () => {
  beforeAll(async () => {
    const responseOrg = await createOrganizationCodegen(
      organizationName,
      hostNameId
    );
    organizationId = responseOrg?.data?.createOrganization?.id ?? '';
    const responseEco = await createSpaceAndGetData(
      spaceName,
      spaceNameId,
      organizationId
    );
    spaceId = responseEco?.data?.space.id ?? '';
  });

  afterAll(async () => {
    await deleteSpaceCodegen(spaceId);
    await deleteOrganizationCodegen(organizationId);
  });

  test('should create space', async () => {
    // Act
    const spaceData = await createSpaceAndGetData(
      spaceName + 'a',
      spaceNameId + 'a',
      organizationId
    );

    const spaceIdTwo = spaceData?.data?.space.id ?? '';

    // Assert
    expect(spaceData.status).toBe(200);
    expect(spaceData?.data?.space.profile.displayName).toEqual(spaceName + 'a');

    await deleteSpaceCodegen(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act
    const response = await updateSpacePlatformCodegen(
      spaceId,
      spaceNameId + 'b'
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.data?.updateSpacePlatformSettings?.nameID).toEqual(
      spaceNameId + 'b'
    );
  });

  test('should not update space nameId', async () => {
    // Arrange
    const response = await createSpaceAndGetData(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response?.data?.space.id ?? '';

    // Act
    const responseUpdate = await updateSpacePlatformCodegen(
      spaceId,
      spaceNameId + 'c'
    );

    // Assert
    expect(responseUpdate.error?.errors[0].message).toContain(
      `Unable to update Space nameID: the provided nameID is already taken: ${spaceNameId +
        'c'}`
    );
    await deleteSpaceCodegen(spaceIdTwo);
  });

  test('should remove space', async () => {
    // Arrange
    const response = await createSpaceAndGetData(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response?.data?.space.id ?? '';
    // Act
    await deleteSpaceCodegen(spaceIdTwo);
    const spacesAfter = await getSpacesDataCodegen();
    const spacesCountAfterRemove = spacesAfter?.data?.spaces;

    // Assert
    expect(spacesCountAfterRemove).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: spaceIdTwo,
        }),
      ])
    );
  });
});
