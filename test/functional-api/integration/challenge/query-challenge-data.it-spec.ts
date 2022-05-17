import '@test/utils/array.matcher';

import {
  createChildChallenge,
  createOpportunity,
  getOpportunityData,
  removeOpportunity,
} from '../opportunity/opportunity.request.params';
import {
  createChallengeMutation,
  getChallengeData,
  getChallengeOpportunity,
  removeChallenge,
  removeChallengeLeadFromOrganization,
  updateChallenge,
} from './challenge.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import { updateChallengeLead } from '@test/utils/mutations/update-mutation';

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
let taglineText = '';
const refName = 'refName';
const refUri = 'https://test.com';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
let hubId = '';
let organizationId = '';
const organizationName = 'quecha-org-name' + uniqueId;
const hostNameId = 'quecha-org-nameid' + uniqueId;
const hubName = 'quecha-eco-name' + uniqueId;
const hubNameId = 'quecha-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);

  organizationId = responseOrg.body.data.createOrganization.id;
  const responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  organizationNameTest = `QA organizationNameTest ${uniqueId}`;

  // Create Organization
  const responseCreateOrganization = await createOrganization(
    organizationNameTest,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.body.data.createOrganization.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
  await deleteOrganization(organizationIdTest);
});

afterEach(async () => {
  await removeOpportunity(opportunityId);
  await removeChallenge(additionalChallengeId);
  await removeChallenge(challengeId);
  // await deleteOrganization(additionalorganizationIdTest);
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
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Query Challenge data', () => {
  test('should query community through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeData(hubId, challengeId);

    // Assert
    expect(
      responseQueryData.body.data.hub.challenge.community.displayName
    ).toEqual(challengeName);
  });

  test('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      challengeId,
      opportunityName,
      opportunityTextId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeOpportunity(hubId, challengeId);

    // Assert
    expect(
      responseQueryData.body.data.hub.challenge.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.hub.challenge.opportunities[0].displayName
    ).toEqual(opportunityName);
    expect(
      responseQueryData.body.data.hub.challenge.opportunities[0].nameID
    ).toEqual(opportunityTextId);
    expect(
      responseQueryData.body.data.hub.challenge.opportunities[0].id
    ).toEqual(opportunityId);
  });

  test('should create child challenge and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createChildChallenge(
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
      hubId,
      additionalChallengeId
    );
    const requestChildChallengeData =
      requestQueryChildChallenge.body.data.hub.challenge;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createChildChallengeData).toEqual(requestChildChallengeData);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunity(
      challengeId,
      opportunityName,
      opportunityTextId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.body.data.createOpportunity.id;

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityData(
      hubId,
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity.body.data.hub.opportunity;

    // Assert
    expect(responseCreateOpportunityOnChallenge.status).toBe(200);
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update a challenge', async () => {
    // Arrange
    const response = await updateChallenge(
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
    const getChallengeDatas = await getChallengeData(hubId, challengeId);

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.displayName).toEqual(challengeName + 'change');
    expect(updatedChallenge.context.tagline).toEqual(taglineText);
    expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(getChallengeDatas.body.data.hub.challenge.displayName).toEqual(
      challengeName + 'change'
    );
    expect(getChallengeDatas.body.data.hub.challenge.context.tagline).toEqual(
      taglineText
    );
    expect(getChallengeDatas.body.data.hub.challenge.tagset.tags).toEqual(
      tagsArray
    );
  });

  test('should add challange lead to organization', async () => {
    // Act
    const response = await updateChallengeLead(challengeId, [
      organizationIdTest,
    ]);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.updateChallenge.leadOrganizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: organizationIdTest,
        }),
      ])
    );
  });

  test('should add same leadOrganization different challanges', async () => {
    // Arrange
    const responseCreateSecondChallenge = await createChallengeMutation(
      challengeName + 'second',
      uniqueTextId + 's',
      hubId
    );
    additionalChallengeId =
      responseCreateSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseFirstChallengeLead = await updateChallengeLead(challengeId, [
      organizationIdTest,
    ]);

    const responseSecondhallengeLead = await updateChallengeLead(
      additionalChallengeId,
      [organizationIdTest]
    );

    // Assert
    expect(responseFirstChallengeLead.status).toBe(200);
    expect(
      responseFirstChallengeLead.body.data.updateChallenge.leadOrganizations
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: organizationIdTest,
        }),
      ])
    );

    expect(
      responseSecondhallengeLead.body.data.updateChallenge.leadOrganizations
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: organizationIdTest,
        }),
      ])
    );
  });

  test('should add 2 leadOrganizations to same challenge', async () => {
    // Arrange
    const createOrganizationResponse = await createOrganization(
      organizationNameTest,
      uniqueTextId + 'k'
    );
    additionalorganizationIdTest =
      createOrganizationResponse.body.data.createOrganization.id;

    // Act
    const responseTwoLeads = await updateChallengeLead(challengeId, [
      organizationIdTest,
      additionalorganizationIdTest,
    ]);

    // Assert
    expect(
      responseTwoLeads.body.data.updateChallenge.leadOrganizations
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: organizationIdTest,
        }),
        expect.objectContaining({
          id: additionalorganizationIdTest,
        }),
      ])
    );

    await deleteOrganization(additionalorganizationIdTest);
  });

  // To be updated as part of this story #1908
  test.skip('should throw error, when try to add same leadOrganization twice to same challenge ', async () => {
    // Act
    const response = await updateChallengeLead(challengeId, [
      organizationIdTest,
      organizationIdTest,
    ]);

    // Assert
    expect(response.text).toContain(
      `Challenge ${challengeId} already has an organization with the provided organization ID: ${organizationIdTest}`
    );
  });

  test('should remove challange lead from organization', async () => {
    // Act
    const responseAddLead = await updateChallengeLead(challengeId, [
      organizationIdTest,
    ]);

    // Act
    const responseRemoveLead = await removeChallengeLeadFromOrganization(
      organizationIdTest,
      challengeId
    );

    // Assert
    expect(responseAddLead.body.data.updateChallenge.leadOrganizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: organizationIdTest,
        }),
      ])
    );

    expect(responseAddLead.body.data.updateChallenge.leadOrganizations).toEqual(
      expect.arrayContaining([])
    );
  });
});
