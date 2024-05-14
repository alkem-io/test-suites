import '../../../utils/array.matcher';
import { deleteSpaceCodegen } from '../space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  createSubspaceCodegen,
  getSubspaceDataCodegen,
  getSubspacesDataCodegen,
} from './challenge.request.params';

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
const organizationName = 'crechal-org-name' + uniqueId;
const hostNameId = 'crechal-org-nameid' + uniqueId;
const spaceName = 'crechal-eco-name' + uniqueId;
const spaceNameId = 'crechal-eco-nameid' + uniqueId;

const challengeData = async (challengeId: string) => {
  const subspaceData = await getSubspaceDataCodegen(
    entitiesId.spaceId,
    challengeId
  );
  return subspaceData;
};

const challengesList = async () => {
  return await getSubspacesDataCodegen(entitiesId.spaceId);
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
  const response = await createSubspaceCodegen(
    challengeName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
    entitiesId.spaceId
  );
  challengeId = response.data?.createSubspace.id ?? '';
});

afterEach(async () => {
  await deleteSpaceCodegen(challengeId);
});

describe('Create subspace', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createSubspaceCodegen(
      'challengeName',
      `${uniqueId}cr`,
      entitiesId.spaceId
    );
    const createSubspaceData = response.data?.createSubspace;
    additionalChallengeId = response.data?.createSubspace.id ?? '';

    // Assert
    expect(response.status).toBe(200);
    expect(createSubspaceData?.profile.displayName).toEqual('challengeName');
    expect(createSubspaceData).toEqual(
      (await getSubspaceDataCodegen(entitiesId.spaceId, additionalChallengeId))
        .data?.space.subspace
    );
  });

  test('should remove a subspace', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challengeData(challengeId);

    // Act
    const deleteSubspaceData = await deleteSpaceCodegen(challengeId);
    // Assert
    expect(deleteSubspaceData.status).toBe(200);
    expect(deleteSubspaceData.data?.deleteSpace.id).toEqual(challengeId);

    expect((await challengesList()).data?.space.subspaces).not.toContainObject(
      challangeDataBeforeRemove.data?.space.subspace
    );
  });

  test('should create 2 subspaces with different names and nameIDs', async () => {
    // Act
    const response = await createSubspaceCodegen(
      'challengeName',
      `${uniqueId}cr2`,
      entitiesId.spaceId
    );
    const challengeId1 = response.data?.createSubspace.id ?? '';

    const responseChallengeTwo = await createSubspaceCodegen(
      //  spaceId,
      `${challengeName}change`,
      `${uniqueId}cc`,
      entitiesId.spaceId
    );
    const challengeId2 = responseChallengeTwo.data?.createSubspace.id ?? '';

    // Assert
    expect((await challengesList()).data?.space.subspaces).toContainObject(
      (await challengeData(challengeId1)).data?.space.subspace
    );
    expect((await challengesList()).data?.space.subspaces).toContainObject(
      (await challengeData(challengeId2)).data?.space.subspace
    );
    await deleteSpaceCodegen(challengeId1);
    await deleteSpaceCodegen(challengeId2);
  });

  describe('DDT invalid NameID', () => {
    //Arrange;
    test.each`
      nameId       | expected
      ${'d'}       | ${'NameID value format is not valid: d'}
      ${'vvv,vvd'} | ${'NameID value format is not valid: vvv,vvd'}
      ${'..-- d'}  | ${'NameID value format is not valid: ..-- d'}
    `(
      'should throw error: "$expected" for nameId value: "$nameId"',
      async ({ nameId, expected }) => {
        const response = await createSubspaceCodegen(
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
