import { createSubspace, getSubspaceData } from './subspace.request.params';
import { deleteSpace, updateSpaceContext } from '../space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let subspaceName = '';
let subspaceId = '';
let additionalSubspaceId = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-flows',
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
  subspaceName = `fl-ch-dname-${uniqueId}`;

  const responseCreateSubspace = await createSubspace(
    subspaceName,
    uniqueId,
    baseScenario.space.id
  );
  subspaceId = responseCreateSubspace.data?.createSubspace.id ?? '';
});

afterEach(async () => {
  await deleteSpace(subspaceId);
});

describe('Flows subspace', () => {
  // ToDo - update test - failing when run in parallel with other suites
  test.skip('should not result unassigned users to a subspace', async () => {
    // Act
    const responseGroupQuery = await getSubspaceData(subspaceId);

    // Assert
    expect(responseGroupQuery.status).toBe(200);
    expect(
      responseGroupQuery.data?.lookup?.space?.subspaces[0]?.community?.roleSet
        .memberUsers
    ).toHaveLength(1);
    expect(
      responseGroupQuery.data?.lookup?.space?.subspaces[0]?.community?.roleSet
        .leadUsers
    ).toHaveLength(1);
  });

  test('should  modify subspace name to allready existing subspace name and/or textId', async () => {
    // Arrange
    // Create second subspace and get its id and name
    const responseSecondSubspace = await createSubspace(
      subspaceName + subspaceName,
      uniqueId + uniqueId,
      baseScenario.space.id
    );
    const secondsubspaceName =
      responseSecondSubspace.data?.createSubspace.about.profile.displayName ??
      '';
    additionalSubspaceId = responseSecondSubspace.data?.createSubspace.id ?? '';

    // Act
    const responseUpdateSubspace = await updateSpaceContext(
      subspaceId,
      secondsubspaceName,
      {
        why: 'test why update',
        who: 'test who update',
      }
    );

    // Assert
    expect(responseUpdateSubspace.status).toBe(200);
    expect(
      responseUpdateSubspace.data?.updateSpace.about.profile.displayName
    ).toEqual(secondsubspaceName);
    await deleteSpace(additionalSubspaceId);
  });

  test('should creating 2 subspaces with same name', async () => {
    // Act
    // Create second subspace with same name
    const response = await createSubspace(
      subspaceName,
      `${uniqueId}-2`,
      baseScenario.space.id
    );
    const subspaceData = response.data?.createSubspace;
    additionalSubspaceId = subspaceData?.id ?? '';

    // Assert
    expect(subspaceData?.about.profile.displayName).toContain(subspaceName);
    await deleteSpace(additionalSubspaceId);
  });

  test('should throw error - creating 2 subspaces with different name and same nameId', async () => {
    // Act
    // Create second subspace with same textId
    const response = await createSubspace(
      subspaceName + subspaceName,
      uniqueId,
      baseScenario.space.id
    );
    // Assert
    expect(JSON.stringify(response)).toContain(
      `Unable to create entity: the provided nameID is already taken: ${uniqueId}`
    );
  });
});
