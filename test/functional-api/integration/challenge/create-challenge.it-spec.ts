import {
  createChallengeMutation,
  getChallengeData,
  getChallengesData,
  removeChallenge,
} from './challenge.request.params';
import '../../../utils/array.matcher';
import { removeSpace } from '../space/space.request.params';
import { deleteOrganization } from '../organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
const organizationName = 'crechal-org-name' + uniqueId;
const hostNameId = 'crechal-org-nameid' + uniqueId;
const spaceName = 'crechal-eco-name' + uniqueId;
const spaceNameId = 'crechal-eco-nameid' + uniqueId;

const challangeData = async (challengeId: string): Promise<any> => {
  const responseQuery = await getChallengeData(entitiesId.spaceId, challengeId);
  const response = responseQuery.body.data.space.challenge;
  return response;
};

const challengesList = async (): Promise<any> => {
  const responseQuery = await getChallengesData(entitiesId.spaceId);
  const response = responseQuery.body.data.space.challenges;
  return response;
};

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

beforeEach(async () => {
  challengeName = `cr-ch-dname-${uniqueId}`;
  const response = await createChallengeMutation(
    challengeName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
    entitiesId.spaceId
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
      entitiesId.spaceId
    );
    const challengeDataCreate = response.body.data.createChallenge;
    additionalChallengeId = response.body.data.createChallenge.id;

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate.profile.displayName).toEqual('challengeName');
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
      //  spaceId,
      `${challengeName}change`,
      `${uniqueId}c`,
      entitiesId.spaceId
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

  // needs investigation
  test.skip('should create challenge with name and textId only', async () => {
    // Act
    const responseSimpleChallenge = await createChallengeMutation(
      `${challengeName}change`,
      `${uniqueId}c`,
      entitiesId.spaceId
    );
    additionalChallengeId =
      responseSimpleChallenge.body.data.createChallenge.id;
    const a = await challengesList();
    // console.log(a);
    // Assert
    // expect(a).toEqual(
    //   expect.arrayContaining(
    //     expect.objectContaining(await challangeData(additionalChallengeId))
    //   )
    // );
    expect(await challengesList()).toContainObject([
      await challangeData(additionalChallengeId),
    ]);
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallengeMutation(
      challengeName + 'd',
      uniqueId + 'd',
      entitiesId.spaceId
    );
    // Act
    additionalChallengeId = responseChallenge.body.data.createChallenge.id;

    // Assert
    expect(responseChallenge.status).toBe(200);
    expect(
      responseChallenge.body.data.createChallenge.profile.displayName
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
          entitiesId.spaceId
        );

        // Assert
        expect(response.text).toContain(expected);
      }
    );
  });
});
