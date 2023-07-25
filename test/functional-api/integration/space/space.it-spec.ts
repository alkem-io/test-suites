import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  updateSpace,
  updateSpaceVariablesData,
} from '@test/utils/mutations/update-mutation';
import '../../../utils/array.matcher';
import {
  createTestSpace,
  getSpacesData,
  removeSpace,
} from './space.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';

let spaceId = '';
let organizationId = '';
const organizationName = 'space-org-name' + uniqueId;
const hostNameId = 'space-org-nameid' + uniqueId;
const spaceName = 'space-name' + uniqueId;
const spaceNameId = 'space-nameid' + uniqueId;

describe('Space entity', () => {
  beforeAll(async () => {
    const responseOrg = await createOrganization(organizationName, hostNameId);
    organizationId = responseOrg.body.data.createOrganization.id;
    const responseEco = await createTestSpace(
      spaceName,
      spaceNameId,
      organizationId
    );

    spaceId = responseEco.body.data.createSpace.id;
  });

  afterAll(async () => {
    await removeSpace(spaceId);
    await deleteOrganization(organizationId);
  });

  test('should create space', async () => {
    // Act
    const response = await createTestSpace(
      spaceName + 'a',
      spaceNameId + 'a',
      organizationId
    );

    const spaceIdTwo = response.body.data.createSpace.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createSpace.profile.displayName).toEqual(
      spaceName + 'a'
    );

    await removeSpace(spaceIdTwo);
  });

  test('should update space nameId', async () => {
    // Act

    const response = await mutation(
      updateSpace,
      updateSpaceVariablesData(spaceId, spaceName + 'b', spaceNameId + 'b')
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateSpace.profile.displayName).toEqual(
      spaceName + 'b'
    );
    expect(response.body.data.updateSpace.nameID).toEqual(spaceNameId + 'b');
  });

  test('should not update space nameId', async () => {
    // Arrange

    const response = await createTestSpace(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response.body.data.createSpace.id;

    // Act
    const responseUpdate = await mutation(
      updateSpace,
      updateSpaceVariablesData(spaceId, spaceName + 'a', spaceNameId + 'c')
    );

    // Assert
    expect(responseUpdate.text).toContain(
      `Unable to update Space nameID: the provided nameID is already taken: ${spaceNameId +
        'c'}`
    );
    await removeSpace(spaceIdTwo);
  });

  test('should remove space', async () => {
    // Arrange
    const response = await createTestSpace(
      spaceName + 'c',
      spaceNameId + 'c',
      organizationId
    );
    const spaceIdTwo = response.body.data.createSpace.id;
    const spaces = await getSpacesData();
    const spacesCountBeforeRemove = spaces.body.data.spaces;

    // Act
    await removeSpace(spaceIdTwo);
    const spacesAfter = await getSpacesData();
    const spacesCountAfterRemove = spacesAfter.body.data.spaces;

    // Assert
    expect(spacesCountAfterRemove.length).toEqual(
      spacesCountBeforeRemove.length - 1
    );
  });
});
