import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
} from '../organization/organization.request.params';
import {
  createGroupOnOrganization,
  getGroup,
  getGroupParent,
  getGroups,
  removeUserGroup,
  updateGroup,
} from './group.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import { createGroupOnCommunity } from '../community/community.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverse,
} from '../ecoverse/ecoverse.request.params';

let userId: string;
let groupName = '';
let communityGroupId = '';
let organizationName = '';
let organizationIdTest = '';
let uniqueTextId = '';
let opportunityName = '';
let opportunityTextId = '';
let challengeName = '';
let challengeId = '';
let challengeCommunityId = '';
let opportunityCommunityId = '';
let opportunityId = '';
let getParent = '';
let communityGroupName = '';
let communityGroupProfileID = '';
let organizationGroupId = '';
let organizationId = '';
let ecoverseId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(
    organizationName,
    hostNameId
  );
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;

  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  groupName = `qa groupName ${uniqueTextId}`;
  organizationName = `qa organizationName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `op${uniqueTextId}`;

  // Create organization
  const responseCreateOrganization = await createOrganization(
    organizationName,
    'org' + uniqueTextId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;

  // Create Challenge
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunity(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
  opportunityCommunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.community
      .id;
});

afterAll(async () => {
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
  await deleteOrganization(organizationIdTest);
});

describe('Groups - groups on community', () => {
  beforeEach(async () => {
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
      challengeCommunityId,
      groupName
    );
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
    // Act
    const groupData = await getGroup(communityGroupId);
    const groupsData = await getGroups();

    // Assert
    expect(groupData.body.data.ecoverse.group.id).toEqual(communityGroupId);
    expect(groupData.body.data.ecoverse.group.name).toEqual(communityGroupName);

    expect(groupsData.body.data.ecoverse.groups).toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should remove community challenge group', async () => {
    // Act
    const response = await removeUserGroup(communityGroupId);

    const groupsData = await getGroups();

    // Assert
    expect(response.body.data.deleteUserGroup.id).toEqual(communityGroupId);

    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should update community challenge group', async () => {
    // Act
    const response = await updateGroup(
      communityGroupId,
      groupName + 'change',
      communityGroupProfileID
    );
    const groupsData = await getGroups();

    // Assert
    expect(groupsData.body.data.ecoverse.groups).toContainObject(
      response.body.data.updateUserGroup
    );
  });

  test('should get groups parent community', async () => {
    // Act
    const groupParent = await getGroupParent(communityGroupId);
    getParent = groupParent.body.data.ecoverse.group.parent;

    // Assert
    expect(getParent).toEqual({
      __typename: 'Community',
      id: challengeCommunityId,
    });
    expect(getParent).not.toContainObject({
      __typename: 'Organization',
    });
  });

  test('should get groups parent organization', async () => {
    // Arrange
    // Create organization group
    const responseCreateGroupeOnOrganization = await createGroupOnOrganization(
      organizationName,
      organizationIdTest
    );
    organizationGroupId =
      responseCreateGroupeOnOrganization.body.data.createGroupOnOrganization.id;

    // Act
    const groupParent = await getGroupParent(organizationGroupId);
    getParent = groupParent.body.data.ecoverse.group.parent;

    expect(getParent).not.toEqual({
      __typename: 'Community',
      type: challengeCommunityId,
    });
    expect(getParent).toEqual({
      __typename: 'Organization',
      id: organizationIdTest,
    });
  });

  test('should throw error for creating group with empty name', async () => {
    // Act
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
      challengeCommunityId,
      ''
    );
    const groupsData = await getGroups();

    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'UserGroup name has a minimum length of 2:'
    );
    expect(groupsData.body.data.ecoverse.groups).not.toContainObject({
      id: `${communityGroupId}`,
      name: '',
    });
  });
});
