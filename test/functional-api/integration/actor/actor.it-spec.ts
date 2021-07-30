import '@test/utils/array.matcher';
import {
  createChallangeMutation,
  removeChallangeMutation,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import {
  createOpportunityMutation,
  removeOpportunityMutation,
} from '@test/functional-api/integration/opportunity/opportunity.request.params';
import {
  createActorGroupMutation,
  getActorGroupsPerOpportunity,
  removeActorGroupMutation,
} from '@test/functional-api/integration/actor-groups/actor-groups.request.params';
import {
  createActorMutation,
  getActorData,
  removeActorMutation,
  updateActorMutation,
} from './actor.request.params';
import {
  createOrganisationMutation,
  deleteOrganisationMutation,
  hostNameId,
  organisationName,
} from '../organisation/organisation.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverseMutation,
} from '../ecoverse/ecoverse.request.params';

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
let ecoverseId = '';
let organisationId = '';

let actorData = async (): Promise<string> => {
  const getActor = await getActorData(opportunityId);
  let response =
    getActor.body.data.ecoverse.opportunity.context.ecosystemModel
      .actorGroups[0].actors[0];
  return response;
};

let actorsCountPerActorGroup = async (): Promise<number> => {
  const responseQuery = await getActorGroupsPerOpportunity(opportunityId);
  let response =
    responseQuery.body.data.ecoverse.opportunity.context.ecosystemModel
      .actorGroups[0].actors;
  return response;
};

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
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
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
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
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
  const createActorGroupResponse = await createActorGroupMutation(
    ecosystemModelId,
    actorGroupName,
    actorGroupDescription
  );
  actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;

  // Create Actor
  const createActorResponse = await createActorMutation(
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
  await removeActorMutation(actorId);
  await removeActorGroupMutation(actorGroupId);
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(challengeId);
});

describe('Actors', () => {
  test('should assert created actor', async () => {
    // Assert
    expect(actorDataCreate).toEqual(await actorData());
  });

  test('should update actor', async () => {
    // Act
    const updateActorResponse = await updateActorMutation(
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
    const removeActorResponse = await removeActorMutation(actorId);

    // Assert
    expect(removeActorResponse.body.data.deleteActor.id).toEqual(actorId);
    expect(await actorsCountPerActorGroup()).toHaveLength(0);
  });

  test('should create 2 actors with same details and query them', async () => {
    // Act
    await createActorMutation(
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
