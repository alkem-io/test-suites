import '@test/utils/array.matcher';
import {
  createChallangeMutation,
  removeChallangeMutation,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOrganisationMutation,
  deleteOrganisationMutation,
  hostNameId,
} from '../organisation/organisation.request.params';
import {
  createGroupOnOrganisationMutation,
  getGroup,
  getGroupParent,
  getGroups,
  removeUserGroupMutation,
  updateGroupMutation,
} from './group.request.params';
import {
  createOpportunityMutation,
  removeOpportunityMutation,
} from '../opportunity/opportunity.request.params';
import { createGroupOnCommunityMutation } from '../community/community.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';

let userId: string;
let groupName = '';
let communityGroupId = '';
let organisationName = '';
let organisationIdTest = '';
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
let organisationGroupId = '';
let organisationId = '';
let ecoverseId = '';

beforeAll(async () => {
  const responseOrg = await createOrganisationMutation(
    organisationName,
    hostNameId
  );
  organisationId = responseOrg.body.data.createOrganisation.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organisationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;

  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  groupName = `QA groupName ${uniqueTextId}`;
  organisationName = `QA organisationName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `op${uniqueTextId}`;

  // Create organisation
  const responseCreateOrganisation = await createOrganisationMutation(
    organisationName,
    'org' + uniqueTextId
  );
  organisationIdTest =
    responseCreateOrganisation.body.data.createOrganisation.id;

  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  challengeCommunityId =
    responseCreateChallenge.body.data.createChallenge.community.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
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
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(challengeId);
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
  await deleteOrganisationMutation(organisationIdTest);
});

describe('Groups - groups on community', () => {
  beforeEach(async () => {
    // Create community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
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
    await removeUserGroupMutation(communityGroupId);
    await removeUserGroupMutation(organisationGroupId);
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
    const response = await removeUserGroupMutation(communityGroupId);

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
    const response = await updateGroupMutation(
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
      __typename: 'Organisation',
    });
  });

  test('should get groups parent organisation', async () => {
    // Arrange
    // Create organisation group
    const responseCreateGroupeOnOrganisation = await createGroupOnOrganisationMutation(
      organisationName,
      organisationIdTest
    );
    organisationGroupId =
      responseCreateGroupeOnOrganisation.body.data.createGroupOnOrganisation.id;

    // Act
    const groupParent = await getGroupParent(organisationGroupId);
    getParent = groupParent.body.data.ecoverse.group.parent;

    expect(getParent).not.toEqual({
      __typename: 'Community',
      type: challengeCommunityId,
    });
    expect(getParent).toEqual({
      __typename: 'Organisation',
      id: organisationIdTest,
    });
  });

  test('should throw error for creating group with empty name', async () => {
    // Act
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunityMutation(
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
