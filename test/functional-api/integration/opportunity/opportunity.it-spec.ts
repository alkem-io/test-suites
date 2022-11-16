import '@test/utils/array.matcher';
import {
  createOpportunity,
  getOpportunityData,
  getOpportunitiesData,
  removeOpportunity,
  updateOpportunity,
} from './opportunity.request.params';
import {
  cardDataPerOpportunityCalloutCount,
  createAspectOnCallout,
  removeAspect,
} from '../aspect/aspect.request.params';
import {
  createActorGroup,
  removeActorGroup,
} from '../actor-groups/actor-groups.request.params';
import {
  createRelation,
  removeRelation,
} from '../relations/relations.request.params';
import {
  createProject,
  removeProject,
} from '../project/project.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import {
  createChallengeMutation,
  removeChallenge,
} from '../challenge/challenge.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { TestUser } from '@test/utils';
import {
  createOrgAndHub,
  createChallengeForOrgHub,
  createOpportunityForChallenge,
  getDefaultOpportunityCalloutByNameId,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let additionalOpportunityId = '';
let challengeName = '';
const challengeId = '';
let additionalChallengeId = '';
let aspectId = '';
let aspectNameId = '';
let aspectDisplayName = '';
let aspectDescription = '';
let actorGroupName = '';
let actorGroupDescription = '';
let actorGroupId = '';
let relationId = '';
let relationDescription = '';
let relationActorName = '';
let relationActorType = '';
let relationActorRole = '';
const relationIncoming = 'incoming';
const contextTagline = 'contextTagline';
let projectName = '';
let projectTextId = '';
let projectId = '';
let ecosystemModelId = '';
let opportunityCollaborationId = '';
const hubId = '';
const organizationId = '';
const organizationName = 'opp-org-name' + uniqueId;
const hostNameId = 'opp-org-nameid' + uniqueId;
const hubName = 'opp-eco-name' + uniqueId;
const hubNameId = 'opp-eco-nameid' + uniqueId;
let newOppCalloutId = '';

beforeEach(async () => {
  challengeName = `testChallenge ${uniqueId}`;
  opportunityName = `opportunityName ${uniqueId}`;
  opportunityTextId = `op${uniqueId}`;
  aspectNameId = `aspectnameid-${uniqueId}`;
  aspectDisplayName = `aspectdisplayname-${uniqueId}`;
  aspectDescription = `aspectDescription-${uniqueId}`;
  actorGroupName = `actorGroupName-${uniqueId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueId}`;
  relationDescription = `relationDescription-${uniqueId}`;
  relationActorName = `relationActorName-${uniqueId}`;
  relationActorType = `relationActorType-${uniqueId}`;
  relationActorRole = `relationActorRole-${uniqueId}`;

  projectName = `projectName ${uniqueId}`;
  projectTextId = `pr${uniqueId}`;
});

beforeAll(async () => {
  opportunityName = 'aspect-opp';
  challengeName = 'aspect-chal';
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);
  await createOpportunityForChallenge(opportunityName);
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);

  await removeChallenge(additionalChallengeId);
  await removeChallenge(challengeId);
  await removeChallenge(entitiesId.challengeId);

  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Opportunities', () => {
  afterEach(async () => {
    await removeOpportunity(additionalOpportunityId);
    await removeOpportunity(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity.body.data.hub.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateOpportunity(opportunityId);
    const updateOpportunityData =
      responseUpdateOpportunity.body.data.updateOpportunity;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity.body.data.hub.opportunity;

    // Assert
    expect(responseUpdateOpportunity.status).toBe(200);
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunity(opportunityId);

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(removeOpportunityResponse.body.data.deleteOpportunity.id).toEqual(
      opportunityId
    );
    expect(requestQueryOpportunity.body.errors[0].message).toEqual(
      `Unable to find Opportunity with ID: ${opportunityId}`
    );
  });

  test('should get all opportunities', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityName =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity
        .displayName;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Act
    // Get all opportunities
    const getAllOpportunityResponse = await getOpportunitiesData(
      entitiesId.hubId
    );

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(
      getAllOpportunityResponse.body.data.hub.opportunities
    ).toContainObject({
      displayName: `${opportunityName}`,
    });
  });

  test('should throw an error for creating opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallengeMutation(
      `${challengeName}ch`,
      `${uniqueId}ch`,
      entitiesId.hubId
    );
    additionalChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      `${opportunityTextId}new`
    );
    opportunityId =
      responseCreateOpportunityOnChallengeOne.body.data.createOpportunity.id;

    const responseCreateOpportunityOnChallengeTwo = await createOpportunity(
      additionalChallengeId,
      opportunityName,
      `${opportunityTextId}new`
    );

    // Assert
    expect(responseCreateOpportunityOnChallengeOne.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.status).toBe(200);
    expect(responseCreateOpportunityOnChallengeTwo.text).toContain(
      `Unable to create entity: the provided nameID is already taken: ${opportunityTextId}new`
    );
  });
});

describe('Opportunity sub entities', () => {
  afterAll(async () => {
    await removeOpportunity(opportunityId);
  });
  afterEach(async () => {
    await removeActorGroup(actorGroupId);
    await removeAspect(aspectId);
    await removeRelation(relationId);
    await removeProject(projectId);
    await removeOpportunity(opportunityId);
  });
  beforeEach(async () => {
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      entitiesId.challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    ecosystemModelId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .ecosystemModel.id;
    opportunityCollaborationId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity
        .collaboration.id;

    const cardCallout = await getDefaultOpportunityCalloutByNameId(
      entitiesId.hubId,
      opportunityId,
      'card-default'
    );
    newOppCalloutId = cardCallout[0].id;
  });

  test('should throw error for creating 2 projects with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Project
    const responseCreateProject = await createProject(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;
    projectId = responseCreateProject.body.data.createProject.id;

    const responseCreateProjectSameTextId = await createProject(
      opportunityId,
      projectName + 'dif',
      projectTextId
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.hub.opportunity;

    // Assert
    expect(baseResponse.projects).toHaveLength(1);
    expect(responseCreateProjectSameTextId.text).toContain(
      `Unable to create Project: the provided nameID is already taken: ${projectTextId}`
    );
    expect(baseResponse.projects[0].nameID).toContain(responseProjectData);
  });

  test('should throw error for creating 2 aspects with same title under the same opportunity', async () => {
    // Arrange
    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnCallout(
      newOppCalloutId,
      aspectNameId,
      aspectDisplayName
    );
    aspectId = createAspectResponse.body.data.createAspectOnCallout.id;

    const createAspect2Response = await createAspectOnCallout(
      newOppCalloutId,
      aspectNameId,
      aspectDisplayName
    );

    // Act
    // Get opportunity
    const data = await cardDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      opportunityId,
      'card-default'
    );

    // Assert
    expect(data).toHaveLength(1);
    expect(createAspect2Response.text).toContain(
      `Unable to create Aspect: the provided nameID is already taken: ${aspectDisplayName}`
    );
  });

  test('should throw error for creating 2 actor groups with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Actor group
    const createActorGroupResponse = await createActorGroup(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;
    actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;

    const createActorGroup2Response = await createActorGroup(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );
    const baseResponse =
      responseOpSubEntities.body.data.hub.opportunity.context.ecosystemModel;

    // Assert
    expect(baseResponse.actorGroups).toHaveLength(1);
    expect(createActorGroup2Response.text).toContain(
      `Already have an actor group with the provided name: ${actorGroupName}`
    );
    expect(baseResponse.actorGroups[0].name).toContain(responseActorGroup);
  });

  test('should get all opportunity sub entities', async () => {
    // Arrange
    // Create Aspect on opportunity group
    const createAspectResponse = await createAspectOnCallout(
      newOppCalloutId,
      aspectNameId,
      aspectDisplayName
    );
    aspectId = createAspectResponse.body.data.createAspectOnCallout.id;

    // Create Project
    const responseCreateProject = await createProject(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;
    projectId = responseCreateProject.body.data.createProject.id;
    // Create Actor group
    const createActorGroupResponse = await createActorGroup(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;
    actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;
    // Create Relation
    const createRelationResponse = await createRelation(
      opportunityCollaborationId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole,
      TestUser.GLOBAL_ADMIN
    );

    const responseCreateRelation =
      createRelationResponse.body.data.createRelationOnCollaboration.actorName;
    relationId =
      createRelationResponse.body.data.createRelationOnCollaboration.id;
    // Act
    // Get all opportunities
    const responseOpSubEntities = await getOpportunityData(
      entitiesId.hubId,
      opportunityId
    );
    const baseResponse = responseOpSubEntities.body.data.hub.opportunity;
    const data = await cardDataPerOpportunityCalloutCount(
      entitiesId.hubId,
      opportunityId,
      'card-default'
    );
    // Assert
    expect(data).toHaveLength(1);

    expect(baseResponse.projects).toHaveLength(1);
    expect(baseResponse.projects[0].nameID).toContain(responseProjectData);

    expect(baseResponse.context.ecosystemModel.actorGroups).toHaveLength(1);
    expect(baseResponse.context.ecosystemModel.actorGroups[0].name).toContain(
      responseActorGroup
    );

    expect(baseResponse.collaboration.relations).toHaveLength(1);
    expect(baseResponse.collaboration.relations[0].actorName).toEqual(
      responseCreateRelation
    );
    expect(baseResponse.context.tagline).toEqual(`${contextTagline}`);
  });
});

describe('DDT should not create opportunities with same nameID within the same challenge', () => {
  afterAll(async () => {
    await removeOpportunity(additionalOpportunityId);
  });
  // Arrange
  test.each`
    opportunityDisplayName | opportunityNameIdD | expected
    ${'opp name a'}        | ${'opp-textid-a'}  | ${'nameID":"opp-textid-a'}
    ${'opp name b'}        | ${'opp-textid-a'}  | ${'Unable to create entity: the provided nameID is already taken: opp-textid-a'}
  `(
    'should expect: "$expected" for opportunity creation with name: "$opportunityDisplayName" and nameID: "$opportunityNameIdD"',
    async ({ opportunityDisplayName, opportunityNameIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunity(
        entitiesId.challengeId,
        opportunityDisplayName,
        opportunityNameIdD
      );
      const responseData = JSON.stringify(
        responseCreateOpportunityOnChallenge.body
      ).replace('\\', '');

      if (!responseCreateOpportunityOnChallenge.text.includes('errors')) {
        additionalOpportunityId =
          responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
      }
      // Assert
      expect(responseCreateOpportunityOnChallenge.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
