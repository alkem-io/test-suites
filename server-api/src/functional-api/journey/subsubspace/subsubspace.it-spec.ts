import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteSpace, updateSpaceContext } from '../space/space.request.params';
import {
  createSubspace,
  getSubspaceData,
} from '../subspace/subspace.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const uniqueId = UniqueIDGenerator.getID();

let subsubspaceName = '';
let subsubspaceNameId = '';
let subsubspaceId = '';
let additionalSubsubspaceId: string;
let additionalSubspaceId = '';

beforeEach(async () => {
  subsubspaceName = `subsubspaceName ${uniqueId}`;
  subsubspaceNameId = `op${uniqueId}`;
});

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'subsubspace',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    subspace: {
      subspace: {},
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  subsubspaceName = 'post-opp';
});

afterAll(async () => {
  await deleteSpace(additionalSubspaceId);
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Opportunities', () => {
  afterEach(async () => {
    await deleteSpace(subsubspaceId);
  });

  test('should create subsubspace and query the data', async () => {
    // Act
    // Create Subsubspace
    const responseCreateSubsubspaceOnSubspace = await createSubspace(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );
    const createSubsubspaceData =
      responseCreateSubsubspaceOnSubspace?.data?.createSubspace;

    subsubspaceId = createSubsubspaceData?.id ?? '';

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);
    const requestSubsubspaceData = requestQuerySubsubspace?.data?.lookup?.space;

    // Assert
    // expect(createSubsubspaceData).toEqual(requestSubsubspaceData);
    expect(createSubsubspaceData?.about).toEqual(requestSubsubspaceData?.about);
    expect(createSubsubspaceData?.collaboration).toEqual(
      requestSubsubspaceData?.collaboration
    );
    expect(createSubsubspaceData?.community).toEqual(
      requestSubsubspaceData?.community
    );
    expect(createSubsubspaceData?.id).toEqual(requestSubsubspaceData?.id);
    expect(createSubsubspaceData?.subspaces).toEqual(
      requestSubsubspaceData?.subspaces
    );
  });

  test('should update subsubspace and query the data', async () => {
    // Arrange
    // Create Subsubspace on Subspace
    const responseCreateSubsubspaceOnSubspace = await createSubspace(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );

    subsubspaceId =
      responseCreateSubsubspaceOnSubspace?.data?.createSubspace.id ?? '';
    // Act
    // Update the created Subsubspace
    const responseUpdateSubsubspace = await updateSpaceContext(subsubspaceId);
    const updateSubsubspaceData = responseUpdateSubsubspace?.data?.updateSpace;

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);
    const requestSubsubspaceData = requestQuerySubsubspace?.data?.lookup?.space;

    // Assert
    expect(updateSubsubspaceData?.about.profile).toEqual(
      requestSubsubspaceData?.about.profile
    );
    expect(updateSubsubspaceData?.about).toEqual(requestSubsubspaceData?.about);
  });

  test('should remove subsubspace and query the data', async () => {
    // Arrange
    // Create Subsubspace
    const responseCreateSubsubspaceOnSubspace = await createSubspace(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );
    subsubspaceId =
      responseCreateSubsubspaceOnSubspace?.data?.createSubspace.id ?? '';

    // Act
    // Remove subsubspace
    const removeSubsubspaceResponse = await deleteSpace(subsubspaceId);

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);

    // Assert
    expect(responseCreateSubsubspaceOnSubspace.status).toBe(200);
    expect(removeSubsubspaceResponse?.data?.deleteSpace.id ?? '').toEqual(
      subsubspaceId
    );
    expect(requestQuerySubsubspace?.error?.errors[0].message).toEqual(
      "Unable to find Space using options 'undefined'"
    );
  });

  test('should throw an error for creating subsubspace with same name/NameId on different subspaces', async () => {
    // Arrange
    const responseCreateSubspaceTwo = await createSubspace(
      `${subsubspaceName}ch`,
      `${uniqueId}ch`,
      baseScenario.space.id
    );
    additionalSubspaceId =
      responseCreateSubspaceTwo?.data?.createSubspace.id ?? '';

    // Act
    // Create Subsubspace on Challange One
    const responseCreateSubsubspaceOnSubspaceOne = await createSubspace(
      subsubspaceName,
      `${subsubspaceNameId}new`,
      baseScenario.subspace.id
    );
    subsubspaceId =
      responseCreateSubsubspaceOnSubspaceOne?.data?.createSubspace.id ?? '';

    const responseCreateSubsubspaceOnSubspaceTwo = await createSubspace(
      subsubspaceName,
      `${subsubspaceNameId}new`,
      additionalSubspaceId
    );

    // Assert
    expect(responseCreateSubsubspaceOnSubspaceOne.status).toBe(200);
    expect(
      responseCreateSubsubspaceOnSubspaceTwo?.error?.errors[0].message
    ).toContain(
      `Unable to create entity: the provided nameID is already taken: ${subsubspaceNameId}new`
    );
  });
});

describe('DDT should not create opportunities with same nameID within the same subspace', () => {
  afterAll(async () => {
    await deleteSpace(additionalSubsubspaceId);
  });
  // Arrange
  test.each`
    subsubspaceDisplayName | subsubspaceNameIdD | expected
    ${'opp name a'}        | ${'opp-nameid-a'}  | ${'nameID":"opp-nameid-a'}
    ${'opp name b'}        | ${'opp-nameid-a'}  | ${'Unable to create entity: the provided nameID is already taken: opp-nameid-a'}
  `(
    'should expect: "$expected" for subsubspace creation with name: "$subsubspaceDisplayName" and nameID: "$subsubspaceNameIdD"',
    async ({ subsubspaceDisplayName, subsubspaceNameIdD, expected }) => {
      // Act
      // Create Subsubspace
      const responseCreateSubsubspaceOnSubspace = await createSubspace(
        subsubspaceDisplayName,
        subsubspaceNameIdD,
        baseScenario.subspace.id
      );
      const responseData = JSON.stringify(
        responseCreateSubsubspaceOnSubspace
      ).replace('\\', '');

      if (!responseCreateSubsubspaceOnSubspace?.error) {
        additionalSubsubspaceId =
          responseCreateSubsubspaceOnSubspace?.data?.createSubspace.id ?? '';
      }

      // Assert
      expect(responseData).toContain(expected);
    }
  );
});
