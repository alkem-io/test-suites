import '../../../utils/array.matcher';
import {
  createChallengeMutation,
  removeChallenge,
} from '../challenge/challenge.request.params';
import {
  createRelation,
  getRelationsPerOpportunity,
  removeRelation,
  updateRelation,
} from './relations.request.params';
import {
  createOpportunity,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';

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
let hubId = '';
let organizationId = '';
const organizationName = 'rel-org-name' + uniqueId;
const hostNameId = 'rel-org-nameid' + uniqueId;
const hubName = 'rel-eco-name' + uniqueId;
const hubNameId = 'rel-eco-nameid' + uniqueId;

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

const relationCountPerOpportunity = async (): Promise<number> => {
  const responseQuery = await getRelationsPerOpportunity(hubId, opportunityId);
  const response = responseQuery.body.data.hub.opportunity.relations;
  return response;
};

const relationDataPerOpportunity = async (): Promise<string> => {
  const responseQuery = await getRelationsPerOpportunity(hubId, opportunityId);
  const response = responseQuery.body.data.hub.opportunity.relations[0];
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

  // Create Relation
  const createRelationResponse = await createRelation(
    opportunityId,
    relationIncoming,
    relationDescription,
    relationActorName,
    relationActorType,
    relationActorRole,
    TestUser.GLOBAL_ADMIN
  );
  relationDataCreate = createRelationResponse.body.data.createRelation;
  relationId = createRelationResponse.body.data.createRelation.id;
});

afterEach(async () => {
  await removeRelation(relationId);
  await removeOpportunity(opportunityId);
  await removeChallenge(challengeId);
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
    const responseUpdateRelation = await updateRelation(
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
    const createRelationResponse = await createRelation(
      opportunityId,
      'testRelationType',
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType,
      TestUser.GLOBAL_ADMIN
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
    await createRelation(
      opportunityId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(2);
  });

  test('should remove created relation', async () => {
    // Act
    const responseRemoveRelation = await removeRelation(relationId);

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation.body.data.deleteRelation.id).toEqual(
      relationId
    );
  });

  test('should throw error for removing unexisting relation', async () => {
    // Act
    await removeRelation(relationId);
    const responseRemoveRelation = await removeRelation(relationId);

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation.body.errors[0].message).toEqual(
      `Not able to locate relation with the specified ID: ${relationId}`
    );
  });
});
