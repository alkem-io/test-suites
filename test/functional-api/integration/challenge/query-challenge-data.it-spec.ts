import '@test/utils/array.matcher';

import {
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
} from '../opportunity/opportunity.request.params';
import {
  createChildChallengeCodegen,
  getChallengeDataCodegen,
  deleteChallengeCodegen,
  updateChallengeCodegen,
} from './challenge.request.params';
import {
  createOrganizationCodegen,
  deleteOrganizationCodegen,
} from '../organization/organization.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';

let opportunityName = '';
let opportunityNameId = '';
let opportunityId = '';
let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let uniqueTextId = '';
let organizationNameTest = '';
let organizationIdTest = '';
let taglineText = '';
// const tagsArray = ['tag1', 'tag2'];
const organizationName = 'org-name' + uniqueId;
const hostNameId = 'org-nameid' + uniqueId;
const spaceName = 'eco-name' + uniqueId;
const spaceNameId = 'eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  organizationNameTest = `QA organizationNameTest ${uniqueId}`;

  // Create Organization
  const responseCreateOrganization = await createOrganizationCodegen(
    organizationNameTest,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.data?.createOrganization.id ?? '';
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
  await deleteOrganizationCodegen(organizationIdTest);
});

afterEach(async () => {
  await deleteOpportunityCodegen(opportunityId);
  await deleteChallengeCodegen(additionalChallengeId);
  await deleteChallengeCodegen(challengeId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  opportunityName = `opportunityName ${uniqueTextId}`;
  opportunityNameId = `opp${uniqueTextId}`;
  organizationNameTest = `organizationNameTest ${uniqueTextId}`;
  taglineText = `taglineText ${uniqueTextId}`;
  // Create Challenge
  const responseCreateChallenge = await createChallengeCodegen(
    challengeName,
    uniqueTextId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.data?.createChallenge.id ?? '';
});

describe('Query Challenge data', () => {
  test('should query community through challenge', async () => {
    // Act
    const responseQueryData = await getChallengeDataCodegen(challengeId);

    // Assert
    expect(
      responseQueryData.data?.lookup.challenge?.profile.displayName
    ).toEqual(challengeName);
  });

  test('should query opportunity through challenge', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityNameId,
      challengeId
    );
    opportunityId =
      responseCreateOpportunityOnChallenge.data?.createOpportunity.id ?? '';

    // Query Opportunity data through Challenge query
    const responseQueryData = await getChallengeDataCodegen(challengeId);

    // Assert
    expect(
      responseQueryData.data?.lookup.challenge?.opportunities
    ).toHaveLength(1);
    expect(
      responseQueryData.data?.lookup.challenge?.opportunities?.[0].profile
        .displayName
    ).toEqual(opportunityName);
    expect(
      responseQueryData.data?.lookup.challenge?.opportunities?.[0].nameID
    ).toEqual(opportunityNameId);
    expect(
      responseQueryData.data?.lookup.challenge?.opportunities?.[0].id
    ).toEqual(opportunityId);
  });

  test('should create child challenge and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createChildChallengeCodegen(
      challengeId,
      opportunityName,
      opportunityNameId
    );
    const createChildChallengeData =
      responseCreateOpportunityOnChallenge.data?.createChildChallenge;

    additionalChallengeId =
      responseCreateOpportunityOnChallenge.data?.createChildChallenge.id ?? '';

    // Query Opportunity data
    const requestQueryChildChallenge = await getChallengeDataCodegen(
      additionalChallengeId
    );
    const requestChildChallengeData =
      requestQueryChildChallenge.data?.lookup.challenge;

    // Assert
    expect(createChildChallengeData).toEqual(requestChildChallengeData);
  });

  test('should create opportunity and query the data', async () => {
    // Act
    // Create Opportunity
    const responseCreateOpportunityOnChallenge = await createOpportunityCodegen(
      opportunityName,
      opportunityNameId,
      challengeId
    );

    const createOpportunityData =
      responseCreateOpportunityOnChallenge.data?.createOpportunity;

    opportunityId =
      responseCreateOpportunityOnChallenge.data?.createOpportunity.id ?? '';

    // Query Opportunity data
    const requestQueryOpportunity = await getOpportunityDataCodegen(
      opportunityId
    );
    const requestOpportunityData =
      requestQueryOpportunity.data?.lookup.opportunity;

    // Assert
    expect(createOpportunityData).toEqual(requestOpportunityData);
  });

  test('should update a challenge', async () => {
    // Arrange
    const response = await updateChallengeCodegen(
      challengeId,
      challengeName + 'change',
      taglineText,
      'background',
      'vision',
      'impact',
      'who'
    );
    const updatedChallenge = response.data?.updateChallenge;

    // Act
    const getChallengeDatas = await getChallengeDataCodegen(challengeId);

    // Assert
    expect(updatedChallenge?.profile.displayName).toEqual(
      challengeName + 'change'
    );
    expect(updatedChallenge?.profile.tagline).toEqual(taglineText);
    //expect(updatedChallenge.tagset.tags).toEqual(tagsArray);
    expect(
      getChallengeDatas.data?.lookup.challenge?.profile.displayName
    ).toEqual(challengeName + 'change');
    expect(getChallengeDatas.data?.lookup.challenge?.profile.tagline).toEqual(
      taglineText
    );
    // expect(getChallengeDatas.body.data.space.challenge.tagset.tags).toEqual(
    //   tagsArray
    // );
  });
});
