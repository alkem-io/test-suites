import {
  createChallengeMutation,
  createChildChallenge,
  getChallengeData,
  removeChallange,
  updateChallange,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';
import {
  createTestEcoverse,
  ecoverseName,
  ecoverseNameId,
  removeEcoverse,
} from '../ecoverse/ecoverse.request.params';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let childChallengeName = '';
let childChallengeNameId = '';
let uniqueId = '';
let ecoverseId = '';
let organizationId = '';

beforeAll(async () => {
  const responseOrg = await createOrganization(
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
});

afterAll(async () => {
  await removeEcoverse(ecoverseId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  uniqueId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueId}`;
  childChallengeName = `opportunityName ${uniqueId}`;
  childChallengeNameId = `opp${uniqueId}`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    ecoverseId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

afterEach(async () => {
  let x = await removeChallange(additionalChallengeId);
  await removeChallange(challengeId);
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
    const responseSecondChallenge = await createChallengeMutation(
      challengeName + challengeName,
      uniqueId + uniqueId,
      ecoverseId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.displayName;
    additionalChallengeId =
      responseSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseUpdateChallenge = await updateChallange(
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
    const response = await createChallengeMutation(
      challengeName,
      `${uniqueId}-2`,
      ecoverseId
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
    const response = await createChallengeMutation(
      challengeName + challengeName,
      uniqueId,
      ecoverseId
    );

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toContain(
      `Unable to create Challenge: the provided nameID is already taken: ${uniqueId}`
    );
  });

  // Skip due to the following bug: https://app.zenhub.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/1484
  test.skip('should add "childChallenge" to "challenge"', async () => {
    // Act
    // Add opportunity to a challenge
    const responseCreateChildChallenge = await createChildChallenge(
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
