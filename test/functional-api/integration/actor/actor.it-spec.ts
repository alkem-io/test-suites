import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createActorGroup,
  getActorGroupsPerOpportunity,
  removeActorGroup,
} from '@test/functional-api/integration/actor-groups/actor-groups.request.params';
import {
  createActor,
  getActorData,
  removeActor,
  updateActor,
} from './actor.request.params';
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
let actorGroupId = '';
let actorGroupName = '';
let actorGroupDescription = '';
let actorId = '';
let actorName = '';
let actorDescription = '';
let actorValue = '';
let actorImpact = '';
let uniqueTextId = '';
let actorDataCreate = '';
let ecosystemModelId = '';
let hubId = '';
let organizationId = '';
const organizationName = 'act-org-name' + uniqueId;
const hostNameId = 'act-org-nameid' + uniqueId;
const hubName = 'act-eco-name' + uniqueId;
const hubNameId = 'act-eco-nameid' + uniqueId;

const actorData = async (): Promise<string> => {
  const getActor = await getActorData(hubId, opportunityId);
  const response =
    getActor.body.data.hub.opportunity.context.ecosystemModel.actorGroups[0]
      .actors[0];
  return response;
};

const actorsCountPerActorGroup = async (): Promise<number> => {
  const responseQuery = await getActorGroupsPerOpportunity(
    hubId,
    opportunityId
  );
  const response =
    responseQuery.body.data.hub.opportunity.context.ecosystemModel
      .actorGroups[0].actors;
  return response;
};

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  const responseEco = await createTestHub(hubName, hubNameId, organizationId);
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
  actorName = `actorName-${uniqueTextId}`;
  actorDescription = `actorName-${uniqueTextId}`;
  actorValue = `actorName-${uniqueTextId}`;
  actorImpact = `actorName-${uniqueTextId}`;
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

  // Create Actor Group
  const createActorGroupResponse = await createActorGroup(
    ecosystemModelId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;

  // Create Actor
  const createActorResponse = await createActor(
    actorGroupId,
    actorName,
    actorDescription,
    actorValue,
    actorImpact
  );
  actorDataCreate = createActorResponse.body.data.createActor;
  actorId = createActorResponse.body.data.createActor.id;
});

afterEach(async () => {
  await removeActor(actorId);
  await removeActorGroup(actorGroupId);
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
});

describe('Actors', () => {
  test('should assert created actor', async () => {
    // Assert
    expect(actorDataCreate).toEqual(await actorData());
  });

  test('should update actor', async () => {
    // Act
    const updateActorResponse = await updateActor(
      actorId,
      actorName + 'change',
      actorDescription + 'change',
      actorValue + 'change',
      actorImpact + 'change'
    );
    const response = updateActorResponse.body;

    // Assert
    expect(response.data.updateActor).toEqual(await actorData());
  });

  test('should remove actor', async () => {
    // Act
    const removeActorResponse = await removeActor(actorId);

    // Assert
    expect(removeActorResponse.body.data.deleteActor.id).toEqual(actorId);
    expect(await actorsCountPerActorGroup()).toHaveLength(0);
  });

  test('should create 2 actors with same details and query them', async () => {
    // Act
    await createActor(
      actorGroupId,
      actorName,
      actorDescription,
      actorValue,
      actorImpact
    );

    // Assert
    expect(await actorsCountPerActorGroup()).toHaveLength(2);
  });
});
