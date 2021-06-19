import {
  createChallangeMutation,
  createChildChallengeMutation,
  getChallengeData,
  removeChallangeMutation,
  updateChallangeMutation,
} from './challenge.request.params';
import '@test/utils/array.matcher';
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

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let childChallengeName = '';
let childChallengeNameId = '';
let uniqueId = '';
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
});

afterAll(async () => {
  await removeEcoverseMutation(ecoverseId);
  await deleteOrganisationMutation(organisationId);
});

beforeEach(async () => {
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueId}`;
  childChallengeName = `opportunityName ${uniqueId}`;
  childChallengeNameId = `opp${uniqueId}`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallangeMutation(
    challengeName,
    uniqueId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

afterEach(async () => {
  let x = await removeChallangeMutation(additionalChallengeId);
  await removeChallangeMutation(challengeId);
});

describe('Flows challenge', () => {
  test('should not result unassigned users to a challenge', async () => {
    // Act
    const responseGroupQuery = await getChallengeData(challengeId);

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.body.data.ecoverse.challenge.community.members
    ).toHaveLength(0);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallangeMutation(
      challengeName + challengeName,
      uniqueId + uniqueId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.displayName;
    additionalChallengeId =
      responseSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseUpdateChallenge = await updateChallangeMutation(
      challengeId,
      secondchallengeName,
      'taglineText',
      'background',
      'vision',
      'impact',
      'who',
      'tagsArray'
    );
    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(
      responseUpdateChallenge.body.data.updateChallenge.displayName
    ).toEqual(secondchallengeName);
  });

  test('should creating 2 challenges with same name', async () => {
    // Act
    // Create second challenge with same name
    const response = await createChallangeMutation(
      challengeName,
      `${uniqueId}-2`
    );
    additionalChallengeId = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.displayName).toContain(
      challengeName
    );
  });

  test('should throw error - creating 2 challenges with different name and same textId', async () => {
    // Act
    // Create second challenge with same textId
    const response = await createChallangeMutation(
      challengeName + challengeName,
      uniqueId
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `Unable to create Challenge: the provided nameID is already taken: ${uniqueId}`
    );
  });

  test('should add "childChallenge" to "challenge"', async () => {
    // Act
    // Add opportunity to a challenge
    const responseCreateChildChallenge = await createChildChallengeMutation(
      challengeId,
      childChallengeName,
      childChallengeNameId
    );
    const childChallengeNameResponse =
      responseCreateChildChallenge.body.data.createChildChallenge.displayName;
    additionalChallengeId =
      responseCreateChildChallenge.body.data.createChildChallenge.id;

    // Assert
    expect(responseCreateChildChallenge.status).toBe(200);
    expect(childChallengeNameResponse).toEqual(childChallengeName);
    expect(additionalChallengeId).not.toBeNull;
  });
});
