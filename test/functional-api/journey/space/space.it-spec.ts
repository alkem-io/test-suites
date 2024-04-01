import { uniqueId } from '@test/utils/mutations/create-mutation';
import '../../../utils/array.matcher';
import {
  createTestSpaceCodegen,
  deleteSpaceCodegen,
  getSpacesDataCodegen,
  //updateSpaceVisibilityCodegen,
} from './space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { SpaceVisibility } from '@alkemio/client-lib';
import { updateAccountPlatformSettingsCodegen } from '@test/functional-api/account/account.params.request';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

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
    spaceId = responseEco?.data?.createSpace?.space.id ?? '';
  });

  afterAll(async () => {
    await deleteSpaceCodegen(spaceId);
    await deleteOrganizationCodegen(organizationId);
  });

  test('should create space', async () => {
    // Act
    const response = await createTestSpaceCodegen(
      spaceName + 'a',
      spaceNameId + 'a',
      organizationId
    );
    console.log('responseEco', response.error);
    console.log('responseEco', response.data);

    const spaceIdTwo = response?.data?.createSpace.space.id ?? '';

    // Assert
    expect(response.status).toBe(200);
    expect(response?.data?.createSpace.space.profile.displayName).toEqual(
      spaceName + 'a'
    );

    await deleteSpaceCodegen(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act
    // const response = await updateSpaceVisibilityCodegen(
    //   spaceId,
    //   SpaceVisibility.Active,
    //   spaceNameId + 'b'
    // );

    const response = await updateAccountPlatformSettingsCodegen(
      entitiesId.accountId,
      entitiesId.organizationId,
      spaceNameId + 'b',
      SpaceVisibility.Active
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.data?.updateAccountPlatformSettings?.nameID).toEqual(
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
    const spaceIdTwo = response?.data?.createSpace.space.id ?? '';

    // Act
    // const responseUpdate = await updateSpaceVisibilityCodegen(
    //   spaceId,
    //   SpaceVisibility.Active,
    //   spaceNameId + 'c'
    // );

    const responseUpdate = await updateAccountPlatformSettingsCodegen(
      entitiesId.accountId,
      entitiesId.organizationId,
      spaceNameId + 'c',
      SpaceVisibility.Active
    );
    console.log('responseUpdate', responseUpdate.error);
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
    const spaceIdTwo = response?.data?.createSpace.space.id ?? '';
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
