import '../../../utils/array.matcher';
import { deleteSpace } from '../space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/types/entities-helper';
import {
  createSubspaceCodegen,
  getSubspaceDataCodegen,
  getSubspacesDataCodegen,
} from './challenge.request.params';
export const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

let challengeName = '';
let challengeId = '';
let additionalChallengeId = '';
const organizationName = 'crechal-org-name' + uniqueId;
const hostNameId = 'crechal-org-nameid' + uniqueId;
const spaceName = 'crechal-eco-name' + uniqueId;
const spaceNameId = 'crechal-eco-nameid' + uniqueId;

const challengeData = async (challengeId: string) => {
  const subspaceData = await getSubspaceData(
    entitiesId.spaceId,
    challengeId
  );
  return subspaceData;
};

const challengesList = async () => {
  return await getSubspacesData(entitiesId.spaceId);
};

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

beforeEach(async () => {
  challengeName = `cr-ch-dname-${uniqueId}`;
  const response = await createSubspace(
    challengeName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
    entitiesId.spaceId
  );
  challengeId = response.data?.createSubspace.id ?? '';
});

afterEach(async () => {
  await deleteSpace(challengeId);
});

describe('Create subspace', () => {
  test('should create a successfull challenge', async () => {
    // Act
    const response = await createSubspace(
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
      (await getSubspaceData(entitiesId.spaceId, additionalChallengeId))
        .data?.space.subspace
    );
  });

  test('should remove a subspace', async () => {
    // Arrange
    const challangeDataBeforeRemove = await challengeData(challengeId);

    // Act
    const deleteSubspaceData = await deleteSpace(challengeId);
    // Assert
    expect(deleteSubspaceData.status).toBe(200);
    expect(deleteSubspaceData.data?.deleteSpace.id).toEqual(challengeId);

    expect((await challengesList()).data?.space.subspaces).not.toContainObject(
      challangeDataBeforeRemove.data?.space.subspace
    );
  });

  // ToDo: unstable, passes randomly
  test.skip('should create 2 subspaces with different names and nameIDs', async () => {
    // Act
    const response = await createSubspace(
      `${challengeName}cr23`,
      `${uniqueId}cr23`,
      entitiesId.spaceId
    );
    const challengeId1 = response.data?.createSubspace.id ?? '';

    const responseChallengeTwo = await createSubspace(
      //  spaceId,
      `${challengeName}cc3`,
      `${uniqueId}cc3`,
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
    await deleteSpace(challengeId1);
    await deleteSpace(challengeId2);
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
        const response = await createSubspace(
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
