import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOrganization,
  deleteOrganization,
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
  createOpportunity,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import { createGroupOnCommunity } from '../../roles/community/community.request.params';
import { removeHub } from '../hub/hub.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

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
const hubName = 'gr-eco-name' + uniqueId;
const hubNameId = 'gr-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);

  groupName = `qa groupName ${uniqueId}`;
  organizationName = `qa-org-name ${uniqueId}`;
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  opportunityTextId = `op${uniqueId}`;

  // Create organization
  const responseCreateOrganization = await createOrganization(
    organizationName,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;

  // Create Challenge
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    entitiesId.hubId
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
});

afterAll(async () => {
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
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
    const groupData = await getGroup(entitiesId.hubId, communityGroupId);
    const groupsData = await getGroups(entitiesId.hubId);

    // Assert
    expect(groupData.body.data.hub.group.id).toEqual(communityGroupId);
    expect(groupData.body.data.hub.group.name).toEqual(communityGroupName);

    expect(groupsData.body.data.hub.groups).toContainObject({
      id: `${communityGroupId}`,
      name: `${groupName}`,
    });
  });

  test('should remove community challenge group', async () => {
    // Act
    const response = await removeUserGroup(communityGroupId);

    const groupsData = await getGroups(entitiesId.hubId);

    // Assert
    expect(response.body.data.deleteUserGroup.id).toEqual(communityGroupId);

    expect(groupsData.body.data.hub.groups).not.toContainObject({
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
    const groupsData = await getGroups(entitiesId.hubId);

    // Assert
    expect(groupsData.body.data.hub.groups).toContainObject(
      response.body.data.updateUserGroup
    );
  });

  test('should get groups parent community', async () => {
    // Act
    const groupParent = await getGroupParent(
      entitiesId.hubId,
      communityGroupId
    );
    getParent = groupParent.body.data.hub.group.parent;

    // Assert
    expect(getParent).toEqual({
      __typename: 'Community',
      id: challengeCommunityId,
    });
    expect(getParent).not.toContainObject({
      __typename: 'Organization',
    });
  });

  test.only('should get groups parent organization', async () => {
    // Arrange
    // Create organization group
    const responseCreateGroupeOnOrganization = await createGroupOnOrganization(
      organizationName,
      organizationIdTest
    );
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

  test('should throw error for creating group with empty name', async () => {
    // Act
    // Create challenge community group
    const responseCreateGroupOnCommunnity = await createGroupOnCommunity(
      challengeCommunityId,
      ''
    );
    const groupsData = await getGroups(entitiesId.hubId);
    // Assert
    expect(responseCreateGroupOnCommunnity.text).toContain(
      'DTO validation for class CreateUserGroupInput {\\n} failed! An instance of CreateUserGroupInput has failed the validation:\\n - property name has failed the following constraints: minLength '
    );
    expect(groupsData.body.data.hub.groups).not.toContainObject({
      id: `${communityGroupId}`,
      name: '',
    });
  });
});
