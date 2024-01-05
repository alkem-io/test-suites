import {
  deleteChallengeCodegen,
  getChallengeDataCodegen,
  getChallengesDataCodegen,
} from './challenge.request.params';
import '../../../utils/array.matcher';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { GraphqlReturnWithError } from '@test/utils/graphql.wrapper';
import {
  ChallengeDataQuery,
  ChallengesDataQuery,
} from '@test/generated/alkemio-schema';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
const organizationName = 'crechal-org-name' + uniqueId;
const hostNameId = 'crechal-org-nameid' + uniqueId;
const spaceName = 'crechal-eco-name' + uniqueId;
const spaceNameId = 'crechal-eco-nameid' + uniqueId;

const challengeData = async (
  challengeId: string
): Promise<GraphqlReturnWithError<ChallengeDataQuery>> => {
  return await getChallengeDataCodegen(challengeId);
};

const challengesList = async (): Promise<GraphqlReturnWithError<
  ChallengesDataQuery
>> => {
  return await getChallengesDataCodegen(entitiesId.spaceId);
};

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
  challengeName = `cr-ch-dname-${uniqueId}`;
  const response = await createChallengeCodegen(
    challengeName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
    entitiesId.spaceId
  );

  challengeId = response.data?.createChallenge.id ?? '';
});

afterEach(async () => {
  await deleteChallengeCodegen(challengeId);
  await deleteChallengeCodegen(additionalChallengeId);
});

describe('Create Challenge', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createChallengeCodegen(
      'challengeName',
      `${uniqueId}cr`,
      entitiesId.spaceId
    );
    const challengeDataCreate = response.data?.createChallenge;
    additionalChallengeId = response.data?.createChallenge.id ?? '';

    // Assert
    expect(response.status).toBe(200);
    expect(challengeDataCreate?.profile.displayName).toEqual('challengeName');
    expect(challengeDataCreate).toEqual(
      (await challengeData(additionalChallengeId)).data?.lookup.challenge
    );
  });

  test('should remove a challenge', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challengeData(challengeId);

    // Act
    const removeChallengeResponse = await deleteChallengeCodegen(challengeId);
    // Assert
    expect(removeChallengeResponse.status).toBe(200);
    expect(removeChallengeResponse.data?.deleteChallenge.id).toEqual(
      challengeId
    );

    expect((await challengesList()).data?.space.challenges).not.toContainObject(
      challangeDataBeforeRemove.data?.lookup.challenge
    );
  });

  test('should create 2 challenges with different names and textIDs', async () => {
    // Act
    const responseChallengeTwo = await createChallengeCodegen(
      //  spaceId,
      `${challengeName}change`,
      `${uniqueId}cc`,
      entitiesId.spaceId
    );
    additionalChallengeId = responseChallengeTwo.data?.createChallenge.id ?? '';

    // Assert
    expect((await challengesList()).data?.space.challenges).toContainObject(
      (await challengeData(challengeId)).data?.lookup.challenge
    );
    expect((await challengesList()).data?.space.challenges).toContainObject(
      (await challengeData(additionalChallengeId)).data?.lookup.challenge
    );
  });

  test('should create a group, when create a challenge', async () => {
    // // Arrange
    const responseChallenge = await createChallengeCodegen(
      challengeName + 'd',
      uniqueId + 'd',
      entitiesId.spaceId
    );
    // Act
    additionalChallengeId = responseChallenge.data?.createChallenge.id ?? '';

    // Assert
    expect(responseChallenge.data?.createChallenge.profile.displayName).toEqual(
      challengeName + 'd'
    );
    expect(
      responseChallenge.data?.createChallenge.community?.id
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
        const response = await createChallengeCodegen(
          challengeName + 'd',
          nameId + 'd',
          entitiesId.spaceId
        );

        // Assert
        expect(JSON.stringify(response)).toContain(expected);
      }
    );
  });
});
