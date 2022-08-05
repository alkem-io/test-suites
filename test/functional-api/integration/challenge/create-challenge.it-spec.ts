import {
  createChallengeMutation,
  getChallengeData,
  getChallengesData,
  removeChallenge,
} from './challenge.request.params';
import '../../../utils/array.matcher';
import { createTestHub, removeHub } from '../hub/hub.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
let hubId = '';
let organizationId = '';
const organizationName = 'crechal-org-name' + uniqueId;
const hostNameId = 'crechal-org-nameid' + uniqueId;
const hubName = 'crechal-eco-name' + uniqueId;
const hubNameId = 'crechal-eco-nameid' + uniqueId;

const challangeData = async (challengeId: string): Promise<string> => {
  const responseQuery = await getChallengeData(hubId, challengeId);
  const response = responseQuery.body.data.hub.challenge;
  return response;
};

const challengesList = async (): Promise<string> => {
  const responseQuery = await getChallengesData(hubId);
  const response = responseQuery.body.data.hub.challenges;
  return response;
};

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
  challengeName = `cr-ch-dname-${uniqueId}`;
  const response = await createChallengeMutation(
    challengeName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
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
    console.log(removeChallengeResponse.body);
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
      `${uniqueId}c`,
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
      `${uniqueId}c`,
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
      uniqueId + 'd',
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

  describe('DDT invalid NameID', () => {
    // Arrange
    test.each`
      nameId       | expected
      ${'d'}       | ${'NameID value format is not valid: d'}
      ${'vvv,vvd'} | ${'NameID value format is not valid: vvv,vvd'}
      ${'..-- d'}  | ${'NameID value format is not valid: ..-- d'}
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
