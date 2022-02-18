import {
  addUserToGroup,
  createUserDetails,
  getUsersFromChallengeCommunity,
  removeUserFromGroup,
  removeUser,
} from './user.request.params';
import '@test/utils/array.matcher';

import {
  createGroupOnCommunity,
  getCommunityData,
} from '@test/functional-api/integration/community/community.request.params';
import { removeUserGroup } from '../integration/group/group.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../integration/organization/organization.request.params';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  removeEcoverse,
} from '../integration/hub/hub.request.params';

let userName = '';
let userFirstName = '';
let userLastName = '';
let userId = '';
let userPhone = '';
let userEmail = '';
let groupName = '';
let communityGroupId = '';
let challengeName = '';
let challengeCommunityId = '';
let hubCommunityId = '';
//let uniqueTextId = '';
let uniqueId = '';
let hubId = '';
let organizationID = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationID = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    organizationID
  );
  hubId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverse(hubId);
  await deleteOrganization(organizationID);
});

beforeEach(async () => {
  uniqueId = Math.random()
    .toString(12)
    .slice(-6);
  // uniqueTextId = Math.random()
  //   .toString(12)
  //   .slice(-6);
  challengeName = `testChallenge ${uniqueId}`;
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
  const hubCommunityIds = await getCommunityData();
  hubCommunityId = hubCommunityIds.body.data.hub.community.id;

  // Create challenge community group
  const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
    hubCommunityId,
    groupName
  );

  communityGroupId =
    responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;
});

describe('Users and Groups', () => {
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
      communityGroupId
    );

    // Assert
    expect(responseAddUserToGroup.status).toBe(200);
    expect(responseAddUserToGroup.body.data.assignUserToGroup.id).toEqual(
      communityGroupId
    );
    expect(
      getUsersForChallengeCommunity.body.data.hub.group.members[0].id
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
      hubCommunityId,
      testGroupTwo
    );
    let communityGroupIdTwo =
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
      communityGroupId
    );
    // Assert
    expect(responseRemoveUser.status).toBe(200);
    expect(responseRemoveUser.body.data.deleteUser.nameID).toBe(userName);
    expect(
      getUsersForChallengeCommunity.body.data.hub.group.members
    ).toHaveLength(0);
  });
});
function organizationId(
  hubName: string,
  hubNameId: string,
  organizationId: any
) {
  throw new Error('Function not implemented.');
}
