import {
  createChallengeMutation,
  getChallengeData,
  getChallengesData,
  removeChallenge,
} from './challenge.request.params';
import '../../../utils/array.matcher';
import {
  createTestEcoverse,
  hubName,
  hubNameId,
  removeEcoverse,
} from '../hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
  hostNameId,
  organizationName,
} from '../organization/organization.request.params';

let challengeName = '';
let uniqueTextId = '';
let challengeId = '';
let additionalChallengeId = '';
let hubId = '';
let organizationId = '';

const challangeData = async (challengeId: string): Promise<string> => {
  const responseQuery = await getChallengeData(challengeId);
  const response = responseQuery.body.data.hub.challenge;
  return response;
};

const challengesList = async (): Promise<string> => {
  const responseQuery = await getChallengesData();
  const response = responseQuery.body.data.hub.challenges;
  return response;
};

beforeAll(async () => {
  const responseOrg = await createOrganization(organizationName, hostNameId);
  organizationId = responseOrg.body.data.createOrganization.id;
  let responseEco = await createTestEcoverse(
    hubName,
    hubNameId,
    organizationId
  );
  hubId = responseEco.body.data.createEcoverse.id;
});

afterAll(async () => {
  await removeEcoverse(hubId);
  await deleteOrganization(organizationId);
});

beforeEach(async () => {
  uniqueTextId = Math.random()
    .toString(36)
    .slice(-6);
  challengeName = `testChallenge ${uniqueTextId}`;
  const response = await createChallengeMutation(
    challengeName + 'xxx',
    uniqueTextId,
    hubId
  );
  challengeId = response.body.data.createChallenge.id;
});

afterEach(async () => {
  await removeChallenge(challengeId);
  await removeChallenge(additionalChallengeId);
});

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallengeMutation(
      'challengeName',
      'chal-texti',
      hubId
    );
    const challengeDataCreate = response.body.data.createChallenge;
    additionalChallengeId = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate.displayName).toEqual('challengeName');
    expect(challengeDataCreate).toEqual(
      await challangeData(additionalChallengeId)
    );
  });

  test('should remove a challenge', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challangeData(challengeId);

    // Act
    const removeChallengeResponse = await removeChallenge(challengeId);

    // Assert
    expect(removeChallengeResponse.status).toBe(200);
    expect(removeChallengeResponse.body.data.deleteChallenge.id).toEqual(
      challengeId
    );
    expect(await challengesList()).not.toContainObject(
      challangeDataBeforeRemove
    );
  });

  test('should create 2 challenges with different names and textIDs', async () => {
    // Act
    const responseChallengeTwo = await createChallengeMutation(
      //  hubId,
      `${challengeName}change`,
      `${uniqueTextId}c`,
      hubId
    );
    additionalChallengeId = responseChallengeTwo.body.data.createChallenge.id;

    // Assert
    expect(await challengesList()).toContainObject(
      await challangeData(challengeId)
    );
    expect(await challengesList()).toContainObject(
      await challangeData(additionalChallengeId)
    );
  });

  test('should create challenge with name and textId only', async () => {
    // Act
    const responseSimpleChallenge = await createChallengeMutation(
      // hubId,
      `${challengeName}change`,
      `${uniqueTextId}c`,
      hubId
    );
    additionalChallengeId =
      responseSimpleChallenge.body.data.createChallenge.id;

    // Assert
    expect(await challengesList()).toContainObject(
      await challangeData(additionalChallengeId)
    );
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallengeMutation(
      // hubId,
      challengeName + 'd',
      uniqueTextId + 'd',
      hubId
    );

    // Act
    additionalChallengeId = responseChallenge.body.data.createChallenge.id;

    // Assert
    expect(responseChallenge.status).toBe(200);
    expect(
      responseChallenge.body.data.createChallenge.community.displayName
    ).toEqual(challengeName + 'd');
    expect(
      responseChallenge.body.data.createChallenge.community.id
    ).not.toBeNull();
  });

  // to be discussed
  describe('DDT invalid textId', () => {
    // Arrange
    test.each`
      nameId       | expected
      ${'d'}       | ${'Expected type \\"NameID\\". NameID value not valid: d'}
      ${'vvv,vvd'} | ${'Expected type \\"NameID\\". NameID value not valid: vvv,vvd'}
      ${'..-- d'}  | ${'Expected type \\"NameID\\". NameID value not valid: ..-- d'}
    `(
      'should throw error: "$expected" for nameId value: "$nameId"',
      async ({ nameId, expected }) => {
        const response = await createChallengeMutation(
          challengeName + 'd',
          nameId + 'd',
          hubId
        );

        // Assert
        expect(response.text).toContain(expected);
      }
    );
  });
});
