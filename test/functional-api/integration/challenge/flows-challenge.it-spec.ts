import {
  createChallengeMutation,
  createChildChallenge,
  getChallengeData,
  removeChallenge,
  updateChallenge,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import { deleteOrganization } from '../organization/organization.request.params';
import { removeSpace } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { users } from '@test/utils/queries/users-data';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let childChallengeName = '';
let childChallengeNameId = '';
const organizationName = 'flowch-org-name' + uniqueId;
const hostNameId = 'flowch-org-nameid' + uniqueId;
const spaceName = 'flowch-eco-name' + uniqueId;
const spaceNameId = 'flowch-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `fl-ch-dname-${uniqueId}`;
  childChallengeName = `opportunityName ${uniqueId}`;
  childChallengeNameId = `opp${uniqueId}`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

afterEach(async () => {
  await removeChallenge(challengeId);
});

describe('Flows challenge', () => {
  test('should not result unassigned users to a challenge', async () => {
    // Act
    const responseGroupQuery = await getChallengeData(
      entitiesId.spaceId,
      challengeId
    );

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.body.data.space.challenge.community.memberUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.body.data.space.challenge.community.leadUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.body.data.space.challenge.community.memberUsers[0]
        .email
    ).toEqual(users.globalAdminEmail);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallengeMutation(
      challengeName + challengeName,
      uniqueId + uniqueId,
      entitiesId.spaceId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.profile.displayName;
    additionalChallengeId =
      responseSecondChallenge.body.data.createChallenge.id;

    // Act
    const responseUpdateChallenge = await updateChallenge(
      challengeId,
      secondchallengeName,
      'taglineText',
      'background',
      'vision',
      'impact',
      'who'
    );

    // Assert
    expect(responseUpdateChallenge.status).toBe(200);
    expect(
      responseUpdateChallenge.body.data.updateChallenge.profile.displayName
    ).toEqual(secondchallengeName);
    await removeChallenge(additionalChallengeId);
  });

  test('should creating 2 challenges with same name', async () => {
    // Act
    // Create second challenge with same name
    const response = await createChallengeMutation(
      challengeName,
      `${uniqueId}-2`,
      entitiesId.spaceId
    );
    additionalChallengeId = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.data.createChallenge.profile.displayName).toContain(
      challengeName
    );
    await removeChallenge(additionalChallengeId);
  });

  test('should throw error - creating 2 challenges with different name and same textId', async () => {
    // Act
    // Create second challenge with same textId
    const response = await createChallengeMutation(
      challengeName + challengeName,
      uniqueId,
      entitiesId.spaceId
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
    const responseCreateChildChallenge = await createChildChallenge(
      challengeId,
      childChallengeName,
      childChallengeNameId
    );
    const childChallengeNameResponse =
      responseCreateChildChallenge.body.data.createChildChallenge.profile
        .displayName;
    additionalChallengeId =
      responseCreateChildChallenge.body.data.createChildChallenge.id;

    // Assert
    expect(responseCreateChildChallenge.status).toBe(200);
    expect(childChallengeNameResponse).toEqual(childChallengeName);
    expect(additionalChallengeId).not.toBeNull;
    await removeChallenge(additionalChallengeId);
  });
});
