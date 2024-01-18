import '../../../utils/array.matcher';
import {
  createRelation,
  relationCountPerOpportunity,
  relationDataPerOpportunity,
  removeRelation,
  updateRelation,
} from './relations.request.params';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { removeChallenge } from '../challenge/challenge.request.params';
import { deleteOpportunityCodegen } from '../opportunity/opportunity.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';

const relationIncoming = 'incoming';
const relationOutgoing = 'outgoing';
let opportunityName = '';
let challengeName = '';
let relationId = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
const uniqueTextId = '';
let relationDataCreate = '';
const organizationName = 'rel-org-name' + uniqueId;
const hostNameId = 'rel-org-nameid' + uniqueId;
const spaceName = 'rel-eco-name' + uniqueId;
const spaceNameId = 'rel-eco-nameid' + uniqueId;

beforeAll(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;

  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);
  await createOpportunityForChallengeCodegen(opportunityName);
});

afterAll(async () => {
  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  relationDescription = `relationDescription-${uniqueTextId}`;
  relationActorName = `relationActorName-${uniqueTextId}`;
  relationActorType = `relationActorType-${uniqueTextId}`;
  relationActorRole = `relationActorRole-${uniqueTextId}`;

  // Create Relation
  const createRelationResponse = await createRelation(
    entitiesId.opportunityCollaborationId,
    relationIncoming,
    relationDescription,
    relationActorName,
    relationActorType,
    relationActorRole,
    TestUser.GLOBAL_ADMIN
  );

  relationDataCreate =
    createRelationResponse.body.data.createRelationOnCollaboration;
  relationId =
    createRelationResponse.body.data.createRelationOnCollaboration.id;
});

afterEach(async () => {
  await removeRelation(relationId);
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
      entitiesId.opportunityCollaborationId,
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
    const res = await createRelation(
      entitiesId.opportunityCollaborationId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType,
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(2);
    await removeRelation(res.body.data.createRelationOnCollaboration.id);
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
