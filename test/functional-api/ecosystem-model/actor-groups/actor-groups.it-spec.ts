import '@test/utils/array.matcher';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import {
  createActorGroup,
  getActorGroupsPerOpportunity,
  removeActorGroup,
} from './actor-groups.request.params';
import {
  createOpportunityCodegen,
  deleteOpportunityCodegen,
} from '@test/functional-api/journey/opportunity/opportunity.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';

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
const organizationName = 'actgr-org-name' + uniqueId;
const hostNameId = 'actgr-org-nameid' + uniqueId;
const spaceName = 'actgr-eco-name' + uniqueId;
const spaceNameId = 'actgr-eco-nameid' + uniqueId;

const getActorGroupData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(
    entitiesId.spaceId,
    opportunityId
  );
  const response =
    getActor.body.data.space.opportunity.context.ecosystemModel.actorGroups[0];
  return response;
};

const getActorGroupsCountPerOpportunityData = async (): Promise<string> => {
  const getActor = await getActorGroupsPerOpportunity(
    entitiesId.spaceId,
    opportunityId
  );
  const response =
    getActor.body.data.space.opportunity.context.ecosystemModel.actorGroups;
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

  // Create Challenge
  const responseCreateChallenge = await createChallengeCodegen(
    challengeName,
    uniqueTextId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge?.data?.createChallenge.id ?? '';

  // Create Opportunity
  const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
    challengeId,
    opportunityName,
    opportunityTextId
  );
  const createOppData =
    responseCreateOpportunityOnChallenge?.data?.createOpportunity;
  opportunityId = createOppData?.id ?? '';
  ecosystemModelId = createOppData?.context?.ecosystemModel?.id ?? '';

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
  await deleteOpportunityCodegen(opportunityId);
  await deleteChallengeCodegen(challengeId);
});

// Skipping until the feature is being used
describe.skip('Actor groups', () => {
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
