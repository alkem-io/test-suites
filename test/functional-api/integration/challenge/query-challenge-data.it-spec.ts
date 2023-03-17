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
  updateChallenge,
} from './challenge.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { removeHub } from '../hub/hub.request.params';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let opportunityName = '';
let opportunityTextId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let uniqueTextId = '';
let organizationNameTest = '';
let organizationIdTest = '';
let taglineText = '';
const tagsArray = ['tag1', 'tag2'];
let groupName = '';
const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const hubName = 'eco-name' + uniqueId;
const hubNameId = 'eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);

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
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await deleteOrganization(organizationIdTest);
});

afterEach(async () => {
  await removeOpportunity(opportunityId);
  await removeChallenge(additionalChallengeId);
  await removeChallenge(challengeId);
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
    entitiesId.hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

describe('Query Challenge data', () => {
  test('should query community through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeData(
      entitiesId.hubId,
      challengeId
    );

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
    const responseQueryData = await getChallengeOpportunity(
      entitiesId.hubId,
      challengeId
    );

    // Assert
    expect(
      responseQueryData.body.data.hub.challenge.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.body.data.hub.challenge.opportunities[0].profile
        .displayName
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
      entitiesId.hubId,
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
      entitiesId.hubId,
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
      'who'
    );
    const updatedChallenge = response.body.data.updateChallenge;

    // Act
    const getChallengeDatas = await getChallengeData(
      entitiesId.hubId,
      challengeId
    );

    // Assert
    expect(response.status).toBe(200);
    expect(updatedChallenge.profile.displayName).toEqual(
      challengeName + 'change'
    );
    expect(updatedChallenge.profile.tagline).toEqual(taglineText);
    //expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(
      getChallengeDatas.body.data.hub.challenge.profile.displayName
    ).toEqual(challengeName + 'change');
    expect(getChallengeDatas.body.data.hub.challenge.profile.tagline).toEqual(
      taglineText
    );
    // expect(getChallengeDatas.body.data.hub.challenge.tagset.tags).toEqual(
    //   tagsArray
    // );
  });
});
