import { SpaceVisibility } from '@alkemio/client-lib';
import '../../../utils/array.matcher';
import {
  createSpaceAndGetData,
  deleteSpace,
  getSpacesData,
  updateSpacePlatformSettings,
} from './space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let spaceId = '';
let organizationId = '';
let orgAccountId = '';
const organizationName = 'space-org-name' + uniqueId;
const hostNameId = 'space-org-nameid' + uniqueId;
const spaceName = 'space-nam' + uniqueId;
const spaceNameId = 'space-namei' + uniqueId;

describe('Space entity', () => {
  beforeAll(async () => {
    const responseOrg = await createOrganization(organizationName, hostNameId);
    const orgData = responseOrg?.data?.createOrganization;
    organizationId = orgData?.id ?? '';
    orgAccountId = orgData?.account?.id ?? '';
    const responseEco = await createSpaceAndGetData(
      spaceName,
      spaceNameId,
      orgAccountId
    );
    console.log('responseEco', responseEco);
    spaceId = responseEco?.data?.space.id ?? '';
  });

  afterAll(async () => {
    await deleteSpace(spaceId);
    await deleteOrganization(organizationId);
  });

  test.only('should create space', async () => {
    // Act
    const spaceData = await createSpaceAndGetData(
      spaceName + 'a',
      spaceNameId + 'a',
      orgAccountId
    );

    const spaceIdTwo = spaceData?.data?.space.id ?? '';

    // Assert
    expect(spaceData.status).toBe(200);
    expect(spaceData?.data?.space.profile.displayName).toEqual(spaceName + 'a');

    await deleteSpace(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act
    const response = await updateSpacePlatformSettings(
      spaceId,
      spaceNameId + 'b',
      SpaceVisibility.Active
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
      orgAccountId
    );
    const spaceIdTwo = response?.data?.space.id ?? '';

    // Act
    const responseUpdate = await updateSpacePlatformSettings(
      spaceId,
      spaceNameId + 'c',
      SpaceVisibility.Active
    );

    // Assert
    expect(responseUpdate.error?.errors[0].message).toContain(
      `Unable to update Space nameID: the provided nameID is already taken: ${spaceNameId +
        'c'}`
    );
    await deleteSpace(spaceIdTwo);
  });

  test('should remove space', async () => {
    // Arrange
    const response = await createSpaceAndGetData(
      spaceName + 'c',
      spaceNameId + 'c',
      orgAccountId
    );
    const spaceIdTwo = response?.data?.space.id ?? '';
    // Act
    await deleteSpace(spaceIdTwo);
    const spacesAfter = await getSpacesData();
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
