import '@test/utils/array.matcher';

import {
  createOpportunityMutation,
  getOpportunityData,
  getOpportunitiesData,
  removeOpportunityMutation,
  updateOpportunityOnChallengeMutation,
} from './opportunity.request.params';
import {
  createAspectOnOpportunityMutation,
  getAspectPerOpportunity,
  removeAspectMutation,
} from '../aspect/aspect.request.params';
import {
  createActorGroupMutation,
  removeActorGroupMutation,
} from '../actor-groups/actor-groups.request.params';
import {
  createRelationMutation,
  removeRelationMutation,
} from '../relations/relations.request.params';
import {
  createProjectMutation,
  removeProjectMutation,
} from '../project/project.request.params';
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
import { createChallangeMutation, removeChallangeMutation } from '../challenge/challenge.request.params';

let groupName = '';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let additionalOpportunityId = '';
let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let uniqueTextId = '';
let aspectId = '';
let aspectTitle = '';
let aspectFrame = '';
let aspectExplanation = '';
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
let contextId = '';
let ecosystemModelId = '';
let lifecycleId = '';
let ecoverseId = '';
let organisationId = '';
beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(24)
    .slice(-6);
  groupName = `groupName ${uniqueTextId}`;
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `op${uniqueTextId}`;
  aspectTitle = `aspectTitle-${uniqueTextId}`;
  aspectFrame = `aspectFrame-${uniqueTextId}`;
  aspectExplanation = `aspectExplanation-${uniqueTextId}`;
  actorGroupName = `actorGroupName-${uniqueTextId}`;
  actorGroupDescription = `actorGroupDescription-${uniqueTextId}`;
  relationDescription = `relationDescription-${uniqueTextId}`;
  relationActorName = `relationActorName-${uniqueTextId}`;
  relationActorType = `relationActorType-${uniqueTextId}`;
  relationActorRole = `relationActorRole-${uniqueTextId}`;

  projectName = `projectName ${uniqueTextId}`;
  projectTextId = `pr${uniqueTextId}`;
});

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

  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

afterAll(async () => {
  await removeChallangeMutation(additionalChallengeId);
  await removeChallangeMutation(challengeId);
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
});

describe('Opportunities', () => {
  afterEach(async () => {
    await removeOpportunityMutation(additionalOpportunityId);
    await removeOpportunityMutation(opportunityId);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity on Challenge
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    let refId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .references[0].id;

    // Act
    // Update the created Opportunity
    const responseUpdateOpportunity = await updateOpportunityOnChallengeMutation(
      opportunityId
    );
    const updateOpportunityData =
      responseUpdateOpportunity.body.data.updateOpportunity;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(opportunityId);
    const requestOpportunityData =
      requestQueryOpportunity.body.data.ecoverse.opportunity;

    // Assert
    expect(responseUpdateOpportunity.status).toBe(200);
    expect(updateOpportunityData).toEqual(requestOpportunityData);
  });

  test('should remove opportunity and query the data', async () => {
    // Arrange
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Act
    // Remove opportunity
    const removeOpportunityResponse = await removeOpportunityMutation(
      opportunityId
    );

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(opportunityId);

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
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
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
    const getAllOpportunityResponse = await getOpportunitiesData();

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(
      getAllOpportunityResponse.body.data.ecoverse.opportunities
    ).toContainObject({
      displayName: `${opportunityName}`,
    });
  });

  test('should throw an error for creating opportunity with same name/textId on different challenges', async () => {
    // Arrange
    const responseCreateChallengeTwo = await createChallangeMutation(
      `${challengeName}ch`,
      `${uniqueTextId}ch`,
      ecoverseId
    );
    additionalChallengeId =
      responseCreateChallengeTwo.body.data.createChallenge.id;

    // Act
    // Create Opportunity on Challange One
    const responseCreateOpportunityOnChallengeOne = await createOpportunityMutation(
      challengeId,
      opportunityName,
      `${opportunityTextId}new`
    );
    opportunityId =
      responseCreateOpportunityOnChallengeOne.body.data.createOpportunity.id;

    const responseCreateOpportunityOnChallengeTwo = await createOpportunityMutation(
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
  // afterAll(async () => {
  //   await removeOpportunityMutation(opportunityId);
  // });
  afterEach(async () => {
    await removeActorGroupMutation(actorGroupId);
    await removeAspectMutation(aspectId);
    await removeRelationMutation(relationId);
    await removeProjectMutation(projectId);
    await removeOpportunityMutation(opportunityId);
  });
  beforeEach(async () => {
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId,
      contextTagline
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;
    contextId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .id;
    ecosystemModelId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.context
        .ecosystemModel.id;
  });

  test('should throw error for creating 2 projects with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;
    projectId = responseCreateProject.body.data.createProject.id;
    lifecycleId = responseCreateProject.body.data.createProject.lifecycle.id;

    const responseCreateProjectSameTextId = await createProjectMutation(
      opportunityId,
      projectName + 'dif',
      projectTextId
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await getOpportunityData(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

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
    const createAspectResponse = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;
    aspectId = createAspectResponse.body.data.createAspect.id;

    // const getAspect = await getAspectPerOpportunity(opportunityId);
    // const aspectData = getAspect.body.data.opportunity.aspects[0];

    const createAspect2Response = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await getOpportunityData(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

    // Assert
    expect(baseResponse.context.aspects).toHaveLength(1);
    expect(createAspect2Response.text).toContain(
      `Already have an aspect with the provided title: ${aspectTitle}`
    );
    expect(baseResponse.context.aspects[0].title).toContain(responseAspect);
  });

  test('should throw error for creating 2 actor groups with same name/textId under the same opportunity', async () => {
    // Arrange
    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;
    actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;

    const createActorGroup2Response = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );

    // Act
    // Get opportunity
    const responseOpSubEntities = await getOpportunityData(opportunityId);
    const baseResponse =
      responseOpSubEntities.body.data.ecoverse.opportunity.context
        .ecosystemModel;

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
    const createAspectResponse = await createAspectOnOpportunityMutation(
      contextId,
      aspectTitle,
      aspectFrame,
      aspectExplanation
    );
    const responseAspect = createAspectResponse.body.data.createAspect.title;
    aspectId = createAspectResponse.body.data.createAspect.id;
    const getAspect = await getAspectPerOpportunity(opportunityId);

    // Create Project
    const responseCreateProject = await createProjectMutation(
      opportunityId,
      projectName,
      projectTextId
    );
    const responseProjectData =
      responseCreateProject.body.data.createProject.nameID;
    projectId = responseCreateProject.body.data.createProject.id;
    // Create Actor group
    const createActorGroupResponse = await createActorGroupMutation(
      ecosystemModelId,
      actorGroupName,
      actorGroupDescription
    );
    const responseActorGroup =
      createActorGroupResponse.body.data.createActorGroup.name;
    actorGroupId = createActorGroupResponse.body.data.createActorGroup.id;
    // Create Relation
    const createRelationResponse = await createRelationMutation(
      opportunityId,
      relationIncoming,
      relationDescription,
      relationActorName,
      relationActorType,
      relationActorRole
    );
    const responseCreateRelation =
      createRelationResponse.body.data.createRelation.actorName;
    relationId = createRelationResponse.body.data.createRelation.id;
    // Act
    // Get all opportunities
    const responseOpSubEntities = await getOpportunityData(opportunityId);
    const baseResponse = responseOpSubEntities.body.data.ecoverse.opportunity;

    // Assert

    expect(baseResponse.context.aspects).toHaveLength(1);
    expect(baseResponse.context.aspects[0].title).toContain(responseAspect);

    expect(baseResponse.projects).toHaveLength(1);
    expect(baseResponse.projects[0].nameID).toContain(responseProjectData);

    expect(baseResponse.context.ecosystemModel.actorGroups).toHaveLength(1);
    expect(baseResponse.context.ecosystemModel.actorGroups[0].name).toContain(
      responseActorGroup
    );

    expect(baseResponse.relations).toHaveLength(1);
    expect(baseResponse.relations[0].actorName).toEqual(responseCreateRelation);
    expect(baseResponse.context.tagline).toEqual(`${contextTagline}`);
  });
});

describe('DDT should not create opportunities with same nameID within the same challenge', () => {
  afterAll(async () => {
    await removeOpportunityMutation(additionalOpportunityId);
  });
  // Arrange
  test.each`
    opportunityDisplayName | opportunityNameIdD | expected
    ${'opp name a'}        | ${'opp-textid-a'}  | ${'nameID":"opp-textid-a'}
    ${'opp name b'}        | ${'opp-textid-a'}  | ${'Unable to create entity: the provided nameID is already taken: opp-textid-a'}
  `(
    "should expect: '$expected' for opportunity creation with name: '$opportunityDisplayName' and nameID: '$opportunityNameIdD'",
    async ({ opportunityDisplayName, opportunityNameIdD, expected }) => {
      // Act
      // Create Opportunity
      const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
        challengeId,
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
