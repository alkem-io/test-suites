import {
  addUserToGroup,
  createUserDetails,
  getUsersFromChallengeCommunity,
  removeUserFromGroup,
  removeUser,
} from './user.request.params';
import '@test/utils/array.matcher';
import { createGroupOnCommunity } from '@test/functional-api/roles/community/community.request.params';
import { removeUserGroup } from '../integration/group/group.request.params';
import { deleteOrganizationCodegen } from '../integration/organization/organization.request.params';
import { deleteSpaceCodegen } from '../integration/space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '../zcommunications/communications-helper';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';
let communityGroupId = '';
const organizationName = 'usgr-org-name' + uniqueId;
const hostNameId = 'usgr-org-nameid' + uniqueId;
const spaceName = 'usgr-eco-name' + uniqueId;
const spaceNameId = 'usgr-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  userName = `testuser${uniqueId}`;
  userFirstName = `userFirstName${uniqueId}`;
  userLastName = `userLastName${uniqueId}`;
  userPhone = `userPhone ${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;

  // Create user
  const responseCreateUser = await createUserDetails(
    userName,
    userFirstName,
    userLastName,
    userPhone,
    userEmail
  );

  userId = responseCreateUser.body.data.createUser.id;

  groupName = 'groupName ' + Math.random().toString();

  // Create challenge community group
  const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
    entitiesId.spaceCommunityId,
    groupName
  );
  communityGroupId =
    responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;
});

// The goups functionallity needs update
describe.skip('Users and Groups', () => {
  afterEach(async () => {
    await removeUser(userId);
    await removeUserGroup(communityGroupId);
  });

  test('should add "user" to "group"', async () => {
    // Act
    const responseAddUserToGroup = await addUserToGroup(
      userId,
      communityGroupId
    );
    const getUsersForChallengeCommunity = await getUsersFromChallengeCommunity(
      entitiesId.spaceId,
      communityGroupId
    );

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(responseAddUserToGroup.body.data.assignUserToGroup.id).toEqual(
      communityGroupId
    );
    expect(
      getUsersForChallengeCommunity.body.data.space.group.members[0].id
    ).toEqual(userId);
  });

  // check if we should have a validation
  test('should throw error when add same "user", twice to same "group"', async () => {
    // Act
    await addUserToGroup(userId, communityGroupId);
    const responseAddSameUserToGroup = await addUserToGroup(
      userId,
      communityGroupId
    );

    // Assert
    expect(responseAddSameUserToGroup.status).toBe(200);
    expect(responseAddSameUserToGroup.text).toContain(
      `Agent (${userEmail}) already has assigned credential: user-group-member`
    );
  });

  test('should add same "user" to 2 different "groups"', async () => {
    // Arrange
    const testGroupTwo = 'testGroup2';
    const responseCreateGroupOnCommunnityTwo = await createGroupOnCommunity(
      entitiesId.spaceCommunityId,
      testGroupTwo
    );
    const communityGroupIdTwo =
      responseCreateGroupOnCommunnityTwo.body.data.createGroupOnCommunity.id;

    // Act
    const responseAddUserToGroupOne = await addUserToGroup(
      userId,
      communityGroupId
    );

    const responseAddUserToGroupTwo = await addUserToGroup(
      userId,
      communityGroupIdTwo
    );
    // Assert
    expect(responseAddUserToGroupOne.status).toBe(200);
    expect(responseAddUserToGroupOne.body.data.assignUserToGroup.id).toEqual(
      communityGroupId
    );

    expect(responseAddUserToGroupTwo.status).toBe(200);
    expect(responseAddUserToGroupTwo.body.data.assignUserToGroup.id).toEqual(
      communityGroupIdTwo
    );
    await removeUserGroup(communityGroupIdTwo);
  });

  test('should remove "user" from a "group"', async () => {
    // Arrange
    await addUserToGroup(userId, communityGroupId);

    // Act
    const responseRemoveUserFromGroup = await removeUserFromGroup(
      userId,
      communityGroupId
    );

    // Assert
    expect(responseRemoveUserFromGroup.status).toBe(200);
    expect(responseRemoveUserFromGroup.body.data.removeUserFromGroup).toEqual(
      expect.objectContaining({
        name: groupName,
        members: [],
        id: communityGroupId,
      })
    );
    expect(
      responseRemoveUserFromGroup.body.data.removeUserFromGroup.members
    ).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: userId })])
    );
  });

  test('should delete a "user" after added in a "group"', async () => {
    // Arrange
    await addUserToGroup(userId, communityGroupId);

    // Act
    const responseRemoveUser = await removeUser(userId);
    const getUsersForChallengeCommunity = await getUsersFromChallengeCommunity(
      entitiesId.spaceId,
      communityGroupId
    );
    // Assert
    expect(responseRemoveUser.status).toBe(200);
    expect(responseRemoveUser.body.data.deleteUser.id).toBe(userId);
    expect(
      getUsersForChallengeCommunity.body.data.space.group.members
    ).toHaveLength(0);
  });
});
