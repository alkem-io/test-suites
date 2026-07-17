import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { deleteSpace, updateSpaceContext } from '../space/space.request.params';
import {
  createSubspace,
  createSubspaceOrFail,
  getSubspaceData,
  subspaceVariablesData,
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
    // Create Subsubspace (resilient to the ENV_FAILURE retry-after-commit race
    // — see createSubspaceOrFail).
    subsubspaceId = await createSubspaceOrFail(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);
    const queried = requestQuerySubsubspace?.data?.lookup?.space;

    // Assert the content we submitted round-tripped correctly: compare the
    // queried subsubspace against the exact input createSubspace sent
    // (`subspaceVariablesData`). This is a correctness check on our own inputs,
    // so it needs no create-response and is unaffected by the race.
    const expected = subspaceVariablesData(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    ).about;

    expect(queried?.id).toEqual(subsubspaceId);
    expect(queried?.nameID).toEqual(subsubspaceNameId);
    expect(queried?.about?.why).toEqual(expected.why);
    expect(queried?.about?.who).toEqual(expected.who);
    expect({
      displayName: queried?.about?.profile?.displayName,
      tagline: queried?.about?.profile?.tagline,
      description: queried?.about?.profile?.description,
    }).toEqual({
      displayName: expected.profileData.displayName,
      tagline: expected.profileData.tagline,
      description: expected.profileData.description,
    });
    // Note: `referencesData` sent at creation is intentionally not asserted —
    // createSubspace does not persist profile references (the query returns
    // `references: []`); they are added via a separate mutation. The old
    // create-vs-query comparison hid this because both sides were empty.
  });

  test('should update subsubspace and query the data', async () => {
    // Arrange
    // Create Subsubspace on Subspace
    subsubspaceId = await createSubspaceOrFail(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );
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
    subsubspaceId = await createSubspaceOrFail(
      subsubspaceName,
      subsubspaceNameId,
      baseScenario.subspace.id
    );

    // Act
    // Remove subsubspace
    const removeSubsubspaceResponse = await deleteSpace(subsubspaceId);

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);

    // Assert
    expect(removeSubsubspaceResponse?.data?.deleteSpace.id ?? '').toEqual(
      subsubspaceId
    );
    expect(requestQuerySubsubspace?.error?.errors[0].message).toEqual(
      "Unable to find Space using options 'undefined'"
    );
  });

  test('should throw an error for creating subsubspace with same name/NameId on different subspaces', async () => {
    // Arrange
    additionalSubspaceId = await createSubspaceOrFail(
      `${subsubspaceName}ch`,
      `${uniqueId}ch`,
      baseScenario.space.id
    );

    // Act
    // Create Subsubspace on Challange One (arrange-success — resilient to the
    // retry-after-commit race). The assertion under test is that reusing this
    // nameID on a different parent below is rejected.
    subsubspaceId = await createSubspaceOrFail(
      subsubspaceName,
      `${subsubspaceNameId}new`,
      baseScenario.subspace.id
    );

    const responseCreateSubsubspaceOnSubspaceTwo = await createSubspace(
      subsubspaceName,
      `${subsubspaceNameId}new`,
      additionalSubspaceId
    );

    // Assert
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
