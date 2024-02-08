import '../../../utils/array.matcher';
import {
  createRelationCodegen,
  relationCountPerOpportunity,
  relationDataPerOpportunity,
  deleteRelationCodegen,
} from './relations.request.params';
import { deleteOrganizationCodegen } from '../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

import {
  createChallengeForOrgSpaceCodegen,
  createOpportunityForChallengeCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOpportunityCodegen } from '../journey/opportunity/opportunity.request.params';
import { removeChallenge } from '../journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '../journey/space/space.request.params';

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
let relationDataCreate: any;
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
  const createRelationResponse = await createRelationCodegen(
    entitiesId.opportunityCollaborationId,
    relationIncoming,
    relationDescription,
    relationActorName,
    relationActorType,
    relationActorRole,
    TestUser.GLOBAL_ADMIN
  );

  relationDataCreate =
    createRelationResponse?.data?.createRelationOnCollaboration ?? '';
  relationId =
    createRelationResponse?.data?.createRelationOnCollaboration.id ?? '';
});

afterEach(async () => {
  await deleteRelationCodegen(relationId);
});
describe('Relations', () => {
  test('should assert created relation', async () => {
    // Assert
    expect(relationDataCreate).toEqual(await relationDataPerOpportunity());
  });

  test('should throw error for invalied relation type', async () => {
    // Act
    // Create Relation
    const createRelationResponse = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      'testRelationType',
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType,
      TestUser.GLOBAL_ADMIN
    );
    const response = createRelationResponse;

    // Assert
    expect(createRelationResponse.status).toBe(200);
    expect(response.error?.errors[0].message).toContain(
      'Invalid relation type supplied: testRelationType'
    );
  });

  test('should create 2 relations for the same opportunity with the same name', async () => {
    // Act
    // Create second relation with same name
    const res = await createRelationCodegen(
      entitiesId.opportunityCollaborationId,
      relationOutgoing,
      relationDescription,
      relationActorName,
      relationActorRole,
      relationActorType,
      TestUser.GLOBAL_ADMIN
    );

    const relationId = res?.data?.createRelationOnCollaboration.id ?? '';

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(2);
    await deleteRelationCodegen(relationId);
  });

  test('should remove created relation', async () => {
    // Act
    const responseRemoveRelation = await deleteRelationCodegen(relationId);
    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation?.data?.deleteRelation.id).toEqual(relationId);
  });

  test('should throw error for removing unexisting relation', async () => {
    // Act
    await deleteRelationCodegen(relationId);
    const responseRemoveRelation = await deleteRelationCodegen(relationId);

    // Assert
    expect(await relationCountPerOpportunity()).toHaveLength(0);
    expect(responseRemoveRelation.error?.errors[0].message).toEqual(
      `Not able to locate relation with the specified ID: ${relationId}`
    );
  });
});
