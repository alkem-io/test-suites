import '@test/utils/array.matcher';
import {
  createChallengeMutation,
  deleteChallengeCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import {
  createOpportunityCodegen,
  deleteOpportunityCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import {
  createActorGroup,
  getActorGroupsPerOpportunity,
  removeActorGroup,
} from '@test/functional-api/ecosystem-model/actor-groups/actor-groups.request.params';
import {
  createActor,
  getActorData,
  removeActor,
  updateActor,
} from './actor.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

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
const organizationName = 'act-org-name' + uniqueId;
const hostNameId = 'act-org-nameid' + uniqueId;
const spaceName = 'act-eco-name' + uniqueId;
const spaceNameId = 'act-eco-nameid' + uniqueId;

const actorData = async (): Promise<string> => {
  const getActor = await getActorData(entitiesId.spaceId, opportunityId);
  const response =
    getActor.body.data.space.opportunity.context.ecosystemModel.actorGroups[0]
      .actors[0];
  return response;
};

const actorsCountPerActorGroup = async (): Promise<number> => {
  const responseQuery = await getActorGroupsPerOpportunity(
    entitiesId.spaceId,
    opportunityId
  );
  const response =
    responseQuery.body.data.space.opportunity.context.ecosystemModel
      .actorGroups[0].actors;
  return response;
};

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
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
    opportunityName,
    opportunityTextId,
    challengeId
  );
  const oppData = responseCreateOpportunityOnChallenge?.data?.createOpportunity;
  opportunityId = oppData?.id ?? '';
  ecosystemModelId = oppData?.context?.ecosystemModel?.id ?? '';

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
  await deleteOpportunityCodegen(opportunityId);
  await deleteChallengeCodegen(challengeId);
});

// Skipping until the feature is being used
describe.skip('Actors', () => {
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