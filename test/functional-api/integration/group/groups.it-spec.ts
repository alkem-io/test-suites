import '@test/utils/array.matcher';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '../organization/organization.request.params';
import {
  createGroupOnOrganization,
  getGroup,
  getGroupParent,
  getGroupParentOrganization,
  getGroups,
  removeUserGroup,
  updateGroup,
} from './group.request.params';
import {
  createOpportunityCodegen,
  deleteOpportunityCodegen,
} from '../opportunity/opportunity.request.params';
import { createGroupOnCommunity } from '../../roles/community/community.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

let groupName = '';
let communityGroupId = '';
let organizationIdTest = '';
let opportunityName = '';
let opportunityTextId = '';
let challengeName = '';
let challengeId = '';
let challengeCommunityId = '';
let opportunityId = '';
let getParent = '';
let communityGroupName = '';
let communityGroupProfileID = '';
let organizationGroupId = '';
let organizationName = 'org';
const hostNameId = 'group-org-nameid' + uniqueId;
const spaceName = 'gr-eco-name' + uniqueId;
const spaceNameId = 'gr-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  groupName = `groupName ${uniqueId}`;
  organizationName = `qa-org-name ${uniqueId}`;
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  opportunityTextId = `op${uniqueId}`;

  // Create organization
  const responseCreateOrganization = await createOrganizationCodegen(
    organizationName,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization?.data?.createOrganization.id ?? '';

  // Create Challenge
  const responseCreateChallenge = await createChallengeCodegen(
    challengeName,
    uniqueId,
    entitiesId.spaceId
  );
  const challengeData = responseCreateChallenge?.data?.createChallenge;
  challengeId = challengeData?.id ?? '';
  challengeCommunityId = challengeData?.community?.id ?? '';

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
    opportunityName,
    opportunityTextId,
    challengeId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge?.data?.createOpportunity.id ?? '';
});

afterAll(async () => {
  await deleteOpportunityCodegen(opportunityId);
  await removeChallenge(challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
  await deleteOrganizationCodegen(organizationIdTest);
});

describe.skip('Groups - groups on community', () => {
  beforeEach(async () => {
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
      entitiesId.spaceCommunityId,
      groupName
    );
    console.log(responseCreateGroupOnCommunnity.body);
    communityGroupId =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.id;
    communityGroupName =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.name;
    communityGroupProfileID =
      responseCreateGroupOnCommunnity.body.data.createGroupOnCommunity.profile
        .id;
  });

  afterEach(async () => {
    await removeUserGroup(communityGroupId);
    await removeUserGroup(organizationGroupId);
  });
  test('should create community group', async () => {
    // Arrange
    const createGroup = await createGroupOnCommunity(
      entitiesId.spaceCommunityId,
      groupName
    );
    const createGroupData = createGroup.body.data.createGroupOnCommunity;
    const groupId = createGroupData.id;
    const communityGroupId2 = createGroupData.profile.id;
    // Act
    const groupData = await getGroup(entitiesId.spaceId, groupId);
    console.log(groupData.body.data.space.group);

    const groupsData = await getGroups(entitiesId.spaceId);
    console.log(groupsData.body.data.space.groups[0]);
    // Assert
    expect(groupData.body.data.space.group.id).toEqual(groupId);
    expect(groupData.body.data.space.group.profile.displayName).toEqual(
      groupName
    );

    expect(groupsData.body.data.space.groups).toContainObject({
      id: `${groupId}`,
      profile: {
        displayName: `${groupName}`,
        id: communityGroupId2,
      },
    });
    await removeUserGroup(communityGroupId2);
  });

  test('should remove community challenge group', async () => {
    // Act
    const response = await removeUserGroup(communityGroupId);

    const groupsData = await getGroups(entitiesId.spaceId);

    // Assert
    expect(response.body.data.deleteUserGroup.id).toEqual(communityGroupId);

    expect(groupsData.body.data.space.groups).not.toContainObject({
      id: `${communityGroupId}`,
      profile: {
        displayName: `${groupName}`,
        id: communityGroupId,
      },
    });
  });

  test.skip('should update community challenge group', async () => {
    // Act
    const response = await updateGroup(
      communityGroupId,
      groupName + 'change',
      'updated-DisplayName'
    );
    console.log(response.body);
    const groupsData = await getGroups(entitiesId.spaceId);
    console.log(groupsData.body.data.space);

    console.log(groupsData.body.data.space.groups);
    // Assert
    expect(groupsData.body.data.space.groups[0].profile.displayName).toEqual(
      response.body.data.updateUserGroup.profile.displayName
    );
  });

  test('should get groups parent community', async () => {
    // Act
    const groupParent = await getGroupParent(
      entitiesId.spaceId,
      communityGroupId
    );
    getParent = groupParent.body.data.space.group.parent;

    // Assert
    expect(getParent).toEqual({
      __typename: 'Community',
      id: challengeCommunityId,
    });
    expect(getParent).not.toContainObject({
      __typename: 'Organization',
    });
  });

  test.skip('should get groups parent organization', async () => {
    // Arrange
    // Create organization group
    const responseCreateGroupeOnOrganization = await createGroupOnOrganization(
      organizationName,
      organizationIdTest
    );
    console.log(responseCreateGroupeOnOrganization.body);
    organizationGroupId =
      responseCreateGroupeOnOrganization.body.data.createGroupOnOrganization.id;

    // Act
    const groupParent = await getGroupParentOrganization(
      organizationIdTest,
      organizationGroupId
    );
    getParent = groupParent.body.data.organization.group.parent;

    expect(getParent).not.toEqual({
      __typename: 'Community',
      type: challengeCommunityId,
    });
    expect(getParent).toEqual({
      __typename: 'Organization',
      id: organizationIdTest,
    });
  });

  test.skip('should throw error for creating group with empty name', async () => {
    // Act
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
      challengeCommunityId,
      ''
    );
    const groupsData = await getGroups(entitiesId.spaceId);
    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'DTO validation for class CreateUserGroupInput {\\n} failed! An instance of CreateUserGroupInput has failed the validation:\\n - property name has failed the following constraints: minLength '
    );
    expect(groupsData.body.data.space.groups).not.toContainObject({
      id: `${communityGroupId}`,
      profile: {
        displayName: `${groupName}`,
        id: communityGroupId,
      },
    });
  });
});
