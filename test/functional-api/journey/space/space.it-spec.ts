import { uniqueId } from '@test/utils/mutations/create-mutation';
import '../../../utils/array.matcher';
import {
  createTestSpaceCodegen,
  deleteSpaceCodegen,
  getSpacesDataCodegen,
  updateSpaceVisibilityCodegen,
} from './space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { SpaceVisibility } from '@alkemio/client-lib';

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
    const responseEco = await createTestSpaceCodegen(
      spaceName,
      spaceNameId,
      organizationId
    );
    console.log('responseEco', responseEco.error);
    spaceId = responseEco?.data?.createSpace?.id ?? '';
  });

  afterAll(async () => {
    await deleteSpaceCodegen(spaceId);
    await deleteOrganizationCodegen(organizationId);
  });

  test.only('should create space', async () => {
    // Act
    const response = await createTestSpaceCodegen(
      spaceName + 'a',
      spaceNameId + 'a',
      organizationId
    );
    const spaceIdTwo = response?.data?.createSpace.id ?? '';

    // Assert
    expect(response.status).toBe(200);
    expect(response?.data?.createSpace.profile.displayName).toEqual(
      spaceName + 'a'
    );

    await deleteSpaceCodegen(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act
    const response = await updateSpaceVisibilityCodegen(
      spaceId,
      SpaceVisibility.Active,
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
    const response = await createTestSpaceCodegen(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response?.data?.createSpace.id ?? '';

    // Act
    const responseUpdate = await updateSpaceVisibilityCodegen(
      spaceId,
      SpaceVisibility.Active,
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
    const response = await createTestSpaceCodegen(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response?.data?.createSpace.id ?? '';
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
