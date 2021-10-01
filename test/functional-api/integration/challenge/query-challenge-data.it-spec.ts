import '@test/utils/array.matcher';


import {
  createChildChallengeMutation,
  createOpportunityMutation,
  getOpportunityData,
  removeOpportunityMutation,
} from '../opportunity/opportunity.request.params';
import {
  addChallengeLeadToOrganizationMutation,
  createChallengeMutation,
  getChallengeData,
  getChallengeOpportunity,
  removeChallangeMutation,
  removeChallengeLeadFromOrganizationMutation,
  updateChallangeMutation,
} from './challenge.request.params';
import {
  createOrganizationMutation,
  deleteOrganizationMutation,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
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
let organizationNameTest = '';
let organizationIdTest = '';
let additionalorganizationIdTest = '';
//let organizationIdTestTwo = '';
let taglineText = '';
const refName = 'refName';
const refUri = 'https://test.com';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganizationMutation(
    organizationName,
    hostNameId
  );

  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    ecoverseName,
    ecoverseNameId,
    organizationId
  );
  ecoverseId = responseEco.body.data.createEcoverse.id;
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  organizationNameTest = `QA organizationNameTest ${uniqueId}`;

  // Create Organization
  const responseCreateOrganization = await createOrganizationMutation(
    organizationNameTest,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganizationMutation(organizationId);
  await deleteOrganizationMutation(organizationIdTest);
});

afterEach(async () => {
  await deleteOrganizationMutation(additionalorganizationIdTest);
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
  organizationNameTest = `organizationNameTest ${uniqueTextId}`;
  taglineText = `taglineText ${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueTextId,
    ecoverseId
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

  test.skip('should add challange lead to organization', async () => {
    // Act
    const response = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );
    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.assignChallengeLead.id).toEqual(challengeId);
  });

  test.skip('should add different challange leads to same organization', async () => {
    // Arrange
    const responseCreateSecondChallenge = await createChallengeMutation(
      challengeName + 'second',
      uniqueTextId + 's',
      ecoverseId
    );
    additionalChallengeId =
      responseCreateSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseFirstChallengeLead = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );

    const responseSecondhallengeLead = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
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

  test.skip('should add challange lead to 2 organizations', async () => {
    // Arrange
    const createOrganizationResponse = await createOrganizationMutation(
      organizationNameTest,
      uniqueTextId + 'k'
    );
    additionalorganizationIdTest =
      createOrganizationResponse.body.data.createOrganization.id;

    // Act
    const responseFirstOrganization = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );

    const responseSecondOrganization = await addChallengeLeadToOrganizationMutation(
      additionalorganizationIdTest,
      challengeId
    );

    // Assert
    expect(responseFirstOrganization.status).toBe(200);
    expect(responseFirstOrganization.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    expect(responseSecondOrganization.status).toBe(200);
    expect(responseSecondOrganization.body.data.assignChallengeLead.id).toEqual(
      challengeId
    );
    await deleteOrganizationMutation(additionalorganizationIdTest);
  });

  test.skip('should throw error, when try to add the same challnge to organization as a lead ', async () => {
    // Act
    const responseOne = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );

    const responseTwo = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );

    // Assert
    expect(responseOne.status).toBe(200);
    expect(responseOne.body.data.assignChallengeLead.id).toEqual(challengeId);
    expect(responseTwo.status).toBe(200);
    expect(responseTwo.text).toContain(
      `Challenge ${challengeId} already has an organization with the provided organization ID: ${organizationIdTest}`
    );
  });

  test.skip('should remove challange lead from organization', async () => {
    // Act
    const responseAddCL = await addChallengeLeadToOrganizationMutation(
      organizationIdTest,
      challengeId
    );

    // Act
    const responseRemoveCL = await removeChallengeLeadFromOrganizationMutation(
      organizationIdTest,
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
