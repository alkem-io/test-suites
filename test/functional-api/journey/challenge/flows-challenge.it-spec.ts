import {
  createChildChallengeCodegen,
  getChallengeDataCodegen,
  deleteChallengeCodegen,
  updateChallengeCodegen,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

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
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `fl-ch-dname-${uniqueId}`;
  childChallengeName = `opportunityName ${uniqueId}`;
  childChallengeNameId = `opp${uniqueId}`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallengeCodegen(
    challengeName,
    uniqueId,
    entitiesId.spaceId
  );
  challengeId = responseCreateChallenge.data?.createChallenge.id ?? '';
});

afterEach(async () => {
  await deleteChallengeCodegen(challengeId);
});

describe('Flows challenge', () => {
  test('should not result unassigned users to a challenge', async () => {
    // Act
    const responseGroupQuery = await getChallengeDataCodegen(challengeId);

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.data?.lookup.challenge?.community?.memberUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.data?.lookup.challenge?.community?.leadUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.data?.lookup?.challenge?.community?.memberUsers?.[0]
        .email
    ).toEqual(users.globalAdminEmail);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallengeCodegen(
      challengeName + challengeName,
      uniqueId + uniqueId,
      entitiesId.spaceId
    );
    const secondchallengeName =
      responseSecondChallenge.data?.createChallenge.profile.displayName ?? '';
    additionalChallengeId =
      responseSecondChallenge.data?.createChallenge.id ?? '';

    // Act
    const responseUpdateChallenge = await updateChallengeCodegen(
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
      responseUpdateChallenge.data?.updateChallenge.profile.displayName
    ).toEqual(secondchallengeName);
    await deleteChallengeCodegen(additionalChallengeId);
  });

  test('should creating 2 challenges with same name', async () => {
    // Act
    // Create second challenge with same name
    const response = await createChallengeCodegen(
      challengeName,
      `${uniqueId}-2`,
      entitiesId.spaceId
    );
    additionalChallengeId = response.data?.createChallenge.id ?? '';

    // Assert
    expect(response.data?.createChallenge.profile.displayName).toContain(
      challengeName
    );
    await deleteChallengeCodegen(additionalChallengeId);
  });

  test('should throw error - creating 2 challenges with different name and same textId', async () => {
    // Act
    // Create second challenge with same textId
    const response = await createChallengeCodegen(
      challengeName + challengeName,
      uniqueId,
      entitiesId.spaceId
    );

    // Assert
    expect(JSON.stringify(response)).toContain(
      `Unable to create Challenge: the provided nameID is already taken: ${uniqueId}`
    );
  });

  test('should add "childChallenge" to "challenge"', async () => {
    // Act
    // Add opportunity to a challenge
    const responseCreateChildChallenge = await createChildChallengeCodegen(
      challengeId,
      childChallengeName,
      childChallengeNameId
    );
    const childChallengeNameResponse =
      responseCreateChildChallenge.data?.createChildChallenge.profile
        .displayName;
    additionalChallengeId =
      responseCreateChildChallenge.data?.createChildChallenge.id ?? '';

    // Assert
    expect(childChallengeNameResponse).toEqual(childChallengeName);
    expect(additionalChallengeId).not.toBeNull;
    await deleteChallengeCodegen(additionalChallengeId);
  });
});
