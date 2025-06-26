import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteSpace } from '../space/space.request.params';
import {
  createSubspace,
  getSubspaceData,
  getSubspacesData,
} from './subspace.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const uniqueId = UniqueIDGenerator.getID();

let subspaceName = '';
let subspaceId = '';
let additionalSubspaceId = '';

const subspaceData = async (subspaceId: string) => {
  const subspaceData = await getSubspaceData(subspaceId);
  return subspaceData;
};

const subspacesList = async () => {
  return await getSubspacesData(baseScenario.space.id);
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-create',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

beforeEach(async () => {
  subspaceName = `cr-ch-dname-${uniqueId}`;
  const response = await createSubspace(
    subspaceName + 'xxx',
    `cr-ch-nameid-${uniqueId}`,
    baseScenario.space.id
  );
  subspaceId = response.data?.createSubspace.id ?? '';
});

afterEach(async () => {
  await deleteSpace(subspaceId);
});

describe('Create subspace', () => {
  test('should create a successfull subspace', async () => {
    // Act
    const response = await createSubspace(
      'subspaceName',
      `${uniqueId}cr`,
      baseScenario.space.id
    );

    const createSubspaceData = response.data?.createSubspace;
    additionalSubspaceId = response.data?.createSubspace.id ?? '';

    // Assert
    expect(response.status).toBe(200);
    expect(createSubspaceData?.about.profile.displayName).toEqual(
      'subspaceName'
    );
    expect(createSubspaceData).toEqual(
      (await getSubspaceData(additionalSubspaceId)).data?.lookup?.space
    );
    await deleteSpace(additionalSubspaceId);
  });

  test('should remove a subspace', async () => {
    // Arrange
    const challangeDataBeforeRemove = await subspaceData(subspaceId);

    // Act
    const deleteSubspaceData = await deleteSpace(subspaceId);
    // Assert
    expect(deleteSubspaceData.status).toBe(200);
    expect(deleteSubspaceData.data?.deleteSpace.id).toEqual(subspaceId);

    expect(
      (await subspacesList()).data?.lookup?.space?.subspaces
    ).not.toContainEqual(challangeDataBeforeRemove.data?.lookup?.space);
  });

  // ToDo: unstable, passes randomly
  test.skip('should create 2 subspaces with different names and nameIDs', async () => {
    // Act
    const response = await createSubspace(
      `${subspaceName}cr23`,
      `${uniqueId}cr23`,
      baseScenario.space.id
    );
    const subspaceId1 = response.data?.createSubspace.id ?? '';

    const responseSubspaceTwo = await createSubspace(
      //  spaceId,
      `${subspaceName}cc3`,
      `${uniqueId}cc3`,
      baseScenario.space.id
    );
    const subspaceId2 = responseSubspaceTwo.data?.createSubspace.id ?? '';

    // Assert
    expect((await subspacesList()).data?.lookup?.space?.subspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          (await subspaceData(subspaceId1)).data?.lookup?.space?.subspaces[0]
        ),
      ])
    );
    expect((await subspacesList()).data?.lookup?.space?.subspaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining(
          (await subspaceData(subspaceId2)).data?.lookup?.space?.subspaces[0]
        ),
      ])
    );
    await deleteSpace(subspaceId1);
    await deleteSpace(subspaceId2);
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
          subspaceName + 'd',
          nameId + 'd',
          baseScenario.space.id
        );

        // Assert
        expect(JSON.stringify(response)).toContain(expected);
      }
    );
  });
});
