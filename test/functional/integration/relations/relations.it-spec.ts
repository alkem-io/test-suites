import '../../../utils/array.matcher';
import {
  createChallangeMutation,
  removeChallangeMutation,
} from '../challenge/challenge.request.params';
import {
  createRelationMutation,
  getRelationsPerOpportunity,
  removeRelationMutation,
  updateRelationMutation,
} from './relations.request.params';
import {
  createOpportunityMutation,
  removeOpportunityMutation,
} from '../opportunity/opportunity.request.params';
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

const relationIncoming = 'incoming';
const relationOutgoing = 'outgoing';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let relationId = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
let uniqueTextId = '';
let relationDataCreate = '';
let ecoverseId = '';
let organisationId = '';

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

let relationCountPerOpportunity = async (): Promise<number> => {
  const responseQuery = await getRelationsPerOpportunity(opportunityId);
  let response = responseQuery.body.data.ecoverse.opportunity.relations;
  return response;
};

let relationDataPerOpportunity = async (): Promise<String> => {
  const responseQuery = await getRelationsPerOpportunity(opportunityId);
  let response = responseQuery.body.data.ecoverse.opportunity.relations[0];
  return response;
};
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  relationDescription = `relationDescription-${uniqueTextId}`;
  relationActorName = `relationActorName-${uniqueTextId}`;
  relationActorType = `relationActorType-${uniqueTextId}`;
  relationActorRole = `relationActorRole-${uniqueTextId}`;
});

beforeEach(async () => {
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

  // Create Relation
  const createRelationResponse = await createRelationMutation(
    opportunityId,
    relationIncoming,
    relationDescription,
    relationActorName,
    relationActorType,
    relationActorRole
  );
  relationDataCreate = createRelationResponse.body.data.createRelation;
  relationId = createRelationResponse.body.data.createRelation.id;
});

afterEach(async () => {
  await removeRelationMutation(relationId);
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(challengeId);
});

describe('Relations', () => {
  test('should assert created relation', async () => {
    // Assert
    expect(relationDataCreate).toEqual(await relationDataPerOpportunity());
  });

  // Review code implementation in relation.service.ts file for update Relation mutation
  test.skip('should update relation', async () => {
    // Act
    // Update relation
    const responseUpdateRelation = await updateRelationMutation(
      relationId,
      `${relationActorName} + change`,
      `${relationDescription} + change`
    );
    const responseUpdateRelationData =
      responseUpdateRelation.body.data.updateRelation;

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(1);
    expect(responseUpdateRelationData).toEqual(
      await relationDataPerOpportunity()
    );
  });

  test('should throw error for invalied relation type', async () => {
    // Act
    // Create Relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      'testRelationType',
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );
    const response = createRelationResponse.body;

    // Assert
    expect(createRelationResponse.status).toBe(200);
    expect(response.errors[0].message).toContain(
      'Invalid relation type supplied: testRelationType'
    );
  });

  test('should create 2 relations for the same opportunity with the same name', async () => {
    // Act
    // Create second relation with same name
    await createRelationMutation(
      opportunityId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType
    );

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(2);
  });

  test('should remove created relation', async () => {
    // Act
    const responseRemoveRelation = await removeRelationMutation(relationId);

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation.body.data.deleteRelation.id).toEqual(
      relationId
    );
  });

  test('should throw error for removing unexisting relation', async () => {
    // Act
    await removeRelationMutation(relationId);
    const responseRemoveRelation = await removeRelationMutation(relationId);

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation.body.errors[0].message).toEqual(
      `Not able to locate relation with the specified ID: ${relationId}`
    );
  });
});