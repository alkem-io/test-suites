import {
  createChallengeMutation,
  createChildChallenge,
  getChallengeData,
  removeChallenge,
  updateChallenge,
} from './challenge.request.params';
import '@test/utils/array.matcher';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import { users } from '@test/functional-api/zcommunications/communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let childChallengeName = '';
let childChallengeNameId = '';
let hubId = '';
let organizationId = '';
const organizationName = 'flowch-org-name' + uniqueId;
const hostNameId = 'flowch-org-nameid' + uniqueId;
const hubName = 'flowch-eco-name' + uniqueId;
const hubNameId = 'flowch-eco-nameid' + uniqueId;

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  const responseEco = await createTestHub(hubName, hubNameId, organizationId);
  hubId = responseEco.body.data.createHub.id;
});

afterAll(async () => {
  await removeHub(hubId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  challengeName = `fl-ch-dname-${uniqueId}`;
  childChallengeName = `opportunityName ${uniqueId}`;
  childChallengeNameId = `opp${uniqueId}`;

  // Create a challenge and get the created GroupId created within it
  const responseCreateChallenge = await createChallengeMutation(
    challengeName,
    uniqueId,
    hubId
  );
  challengeId = responseCreateChallenge.body.data.createChallenge.id;
});

afterEach(async () => {
  const x = await removeChallenge(additionalChallengeId);
  await removeChallenge(challengeId);
});

describe('Flows challenge', () => {
  test('should not result unassigned users to a challenge', async () => {
    // Act
    const responseGroupQuery = await getChallengeData(hubId, challengeId);

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.body.data.hub.challenge.community.memberUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.body.data.hub.challenge.community.leadUsers
    ).toHaveLength(0);
    expect(
      responseGroupQuery.body.data.hub.challenge.community.memberUsers[0].email
    ).toEqual(users.globalAdminIdEmail);
  });

  test('should  modify challenge name to allready existing challenge name and/or textId', async () => {
    // Arrange
    // Create second challenge and get its id and name
    const responseSecondChallenge = await createChallengeMutation(
      challengeName + challengeName,
      uniqueId + uniqueId,
      hubId
    );
    const secondchallengeName =
      responseSecondChallenge.body.data.createChallenge.displayName;
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
      hubId
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
      hubId
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
      responseCreateChildChallenge.body.data.createChildChallenge.displayName;
    additionalChallengeId =
      responseCreateChildChallenge.body.data.createChildChallenge.id;

    // Assert
    expect(responseCreateChildChallenge.status).toBe(200);
    expect(childChallengeNameResponse).toEqual(childChallengeName);
    expect(additionalChallengeId).not.toBeNull;
  });
});
