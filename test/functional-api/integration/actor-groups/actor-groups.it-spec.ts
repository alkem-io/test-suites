import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createActorGroup,
  getActorGroupsPerOpportunity,
  removeActorGroup,
} from './actor-groups.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let actorGroupName = '';
let actorGroupDescription = '';
let uniqueTextId = '';
let actorGroupId = '';
let actorGroupDataCreate = '';
let ecosystemModelId = '';
let hubId = '';
let organizationId = '';
let organizationName = 'actgr-org-name' + uniqueId;
let hostNameId = 'actgr-org-nameid' + uniqueId;
let hubName = 'actgr-eco-name' + uniqueId;
let hubNameId = 'actgr-eco-nameid' + uniqueId;

let getActorGroupData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(hubId, opportunityId);
  let response =
    getActor.body.data.hub.opportunity.context.ecosystemModel.actorGroups[0];
  return response;
};

let getActorGroupsCountPerOpportunityData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(hubId, opportunityId);
  let response =
    getActor.body.data.hub.opportunity.context.ecosystemModel.actorGroups;
  return response;
};

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  actorGroupName = `actorGroupName-${uniqueTextId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueTextId}`;

  // Create Challenge
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueTextId,
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunity(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  opportunityId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
  ecosystemModelId =
    responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
      .ecosystemModel.id;

  // Create Actor group
  const createActorGroupResponse = await createActorGroup(
    ecosystemModelId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;
  actorGroupDataCreate = createActorGroupResponse.body.data.createActorGroup;
});

afterEach(async () => {
  await removeActorGroup(actorGroupId);
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
});

describe('Actor groups', () => {
  test('should assert created actor group without actor', async () => {
    // Assert
    expect(actorGroupDataCreate).toEqual(await getActorGroupData());
  });

  test('should create 2 actor groups for the same opportunity', async () => {
    // Act
    // Create second actor group with different name
    await createActorGroup(
      ecosystemModelId,
      actorGroupName + actorGroupName,
      actorGroupDescription
    );

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(2);
  });

  test('should NOT create 2 actor groups for the same opportunity with same name', async () => {
    // Act
    // Create second actor group with same name
    const responseSecondActorGroup = await createActorGroup(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(1);
    expect(responseSecondActorGroup.body.errors[0].message).toEqual(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
  });

  test('should remove created actor group', async () => {
    // Act
    const responseRemoveActorGroup = await removeActorGroup(actorGroupId);

    // Assert
    expect(await getActorGroupsCountPerOpportunityData()).toHaveLength(0);
    expect(responseRemoveActorGroup.body.data.deleteActorGroup.id).toEqual(
      actorGroupId
    );
  });
});
