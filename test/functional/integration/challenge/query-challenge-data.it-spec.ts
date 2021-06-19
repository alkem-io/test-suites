import '@test/utils/array.matcher';

import {
  createChallangeMutation,
  getChallengeData,
  getChallengeOpportunity,
  removeChallangeMutation,
} from '@test/functional/integration/challenge/challenge.request.params';
import {
  createChildChallengeMutation,
  createOpportunityMutation,
  getOpportunityData,
  removeOpportunityMutation,
} from '../opportunity/opportunity.request.params';
import {
  addChallengeLeadToOrganisationMutation,
  removeChallengeLeadFromOrganisationMutation,
  updateChallangeMutation,
} from './challenge.request.params';
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

const userNameID = 'Qa_User';
let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let uniqueTextId = '';
let uniqueId = '';
let organisationNameTest = '';
let organisationIdTest = '';
let additionalorganisationIdTest = '';
//let organisationIdTestTwo = '';
let taglineText = '';
const refName = 'refName';
const refUri = 'https://test.com';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
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
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  organisationNameTest = `QA organisationNameTest ${uniqueId}`;

  // Create Organisation
  const responseCreateOrganisation = await createOrganisationMutation(
    organisationNameTest,
    'org' + uniqueId
  );
  organisationIdTest =
    responseCreateOrganisation.body.data.createOrganisation.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
  await deleteOrganisationMutation(organisationIdTest);
});

afterEach(async () => {
  await deleteOrganisationMutation(additionalorganisationIdTest);
  await removeOpportunityMutation(opportunityId);
  await removeChallangeMutation(additionalChallengeId);
  await removeChallangeMutation(challengeId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityTextId = `opp${uniqueTextId}`;
  groupName = `groupName ${uniqueTextId}`;
  organisationNameTest = `organisationNameTest ${uniqueTextId}`;
  taglineText = `taglineText ${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueTextId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Query Challenge data', () => {
  test.skip('should query groups through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeData(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.community.groups[0].name
    ).toEqual('members');
  });

  test('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeOpportunity(challengeId);

    // Assert
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0]
        .displayName
    ).toEqual(opportunityName);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].nameID
    ).toEqual(opportunityTextId);
    expect(
      responseQueryData.body.data.ecoverse.challenge.opportunities[0].id
    ).toEqual(opportunityId);
  });

  // review again
  test('should create child challenge and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createChildChallengeMutation(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createChildChallengeData =
      responseCreateOpportunityOnChallenge.body.data.createChildChallenge;

    additionalChallengeId =
      responseCreateOpportunityOnChallenge.body.data.createChildChallenge.id;

    // Query Opportunity data
    const requestQueryChildChallenge = await getChallengeData(
      additionalChallengeId
    );
    const requestChildChallengeData =
      requestQueryChildChallenge.body.data.ecoverse.challenge;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createChildChallengeData).toEqual(requestChildChallengeData);
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

  test('should update a challenge', async () => {
    // Arrange
    const response = await updateChallangeMutation(
      challengeId,
      challengeName + 'change',
      taglineText,
      'background',
      'vision',
      'impact',
      'who',
      tagsArray
    );
    const updatedChallenge = response.body.data.updateChallenge;

    // Act
    const getChallengeDatas = await getChallengeData(challengeId);

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.displayName).toEqual(challengeName + 'change');
    expect(updatedChallenge.context.tagline).toEqual(taglineText);
    expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(getChallengeDatas.body.data.ecoverse.challenge.displayName).toEqual(
      challengeName + 'change'
    );
    expect(
      getChallengeDatas.body.data.ecoverse.challenge.context.tagline
    ).toEqual(taglineText);
    expect(getChallengeDatas.body.data.ecoverse.challenge.tagset.tags).toEqual(
      tagsArray
    );
  });

  test('should add challange lead to organisation', async () => {
    // Act
    const response = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.assignChallengeLead.id).toEqual(challengeId);
  });

  test('should add different challange leads to same organisation', async () => {
    // Arrange
    const responseCreateSecondChallenge = await createChallangeMutation(
      challengeName + 'second',
      uniqueTextId + 's'
    );
    additionalChallengeId =
      responseCreateSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseFirstChallengeLead = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    const responseSecondhallengeLead = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      additionalChallengeId
    );

    // Assert
    expect(responseFirstChallengeLead.status).toBe(200);
    expect(responseFirstChallengeLead.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    expect(responseSecondhallengeLead.status).toBe(200);
    expect(responseSecondhallengeLead.body.data.assignChallengeLead.id).toEqual(
      additionalChallengeId
    );
  });

  test('should add challange lead to 2 organisations', async () => {
    // Arrange
    const createOrganisationResponse = await createOrganisationMutation(
      organisationNameTest,
      uniqueTextId + 'k'
    );
    additionalorganisationIdTest =
      createOrganisationResponse.body.data.createOrganisation.id;

    // Act
    const responseFirstOrganisation = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    const responseSecondOrganisation = await addChallengeLeadToOrganisationMutation(
      additionalorganisationIdTest,
      challengeId
    );

    // Assert
    expect(responseFirstOrganisation.status).toBe(200);
    expect(responseFirstOrganisation.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    expect(responseSecondOrganisation.status).toBe(200);
    expect(responseSecondOrganisation.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    await deleteOrganisationMutation(additionalorganisationIdTest);
  });

  test('should throw error, when try to add the same challnge to organisation as a lead ', async () => {
    // Act
    const responseOne = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    const responseTwo = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    // Assert
    expect(responseOne.status).toBe(200);
    expect(responseOne.body.data.assignChallengeLead.id).toEqual(challengeId);
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.text).toContain(
      `Challenge ${uniqueTextId} already has an organisation with the provided organisation ID: ${organisationIdTest}`
    );
  });

  test('should remove challange lead from organisation', async () => {
    // Act
    const responseAddCL = await addChallengeLeadToOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    // Act
    const responseRemoveCL = await removeChallengeLeadFromOrganisationMutation(
      organisationIdTest,
      challengeId
    );

    // Assert
    expect(responseAddCL.status).toBe(200);
    expect(responseRemoveCL.status).toBe(200);
    expect(responseAddCL.body.data.assignChallengeLead.id).toEqual(challengeId);
    expect(responseRemoveCL.body.data.removeChallengeLead.id).toEqual(
      challengeId
    );
  });
});
