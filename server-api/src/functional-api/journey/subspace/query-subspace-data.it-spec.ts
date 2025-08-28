import { createSubspace, getSubspaceData } from './subspace.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { deleteSpace, updateSpaceContext } from '../space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

let subsubspaceName = '';
let subsubspaceNameId = '';
let subsubspaceId = '';
let subspaceName = '';
let subspaceId = '';
const additionalSubspaceId = '';
let uniqueTextId = '';
let organizationNameTest = '';
let organizationIdTest = '';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'subspace-data-access',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  organizationNameTest = `QA organizationNameTest ${uniqueId}`;

  // Create Organization
  const responseCreateOrganization = await createOrganization(
    organizationNameTest,
    'org' + uniqueId
  );
  organizationIdTest =
    responseCreateOrganization.data?.createOrganization.id ?? '';
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  await deleteOrganization(organizationIdTest);
});

afterEach(async () => {
  await deleteSpace(subsubspaceId);
  await deleteSpace(additionalSubspaceId);
  await deleteSpace(subspaceId);
});

beforeEach(async () => {
  uniqueTextId = Math.random().toString(36).slice(-6);
  subspaceName = `testSubspace ${uniqueTextId}`;
  subsubspaceName = `subsubspaceName ${uniqueTextId}`;
  subsubspaceNameId = `opp${uniqueTextId}`;
  organizationNameTest = `organizationNameTest ${uniqueTextId}`;
  // Create Subspace
  const responseCreateSubspace = await createSubspace(
    subspaceName,
    uniqueTextId,
    baseScenario.space.id
  );
  subspaceId = responseCreateSubspace.data?.createSubspace.id ?? '';
});

describe('Query Subspace data', () => {
  test('should query community through subspace', async () => {
    // Act
    const responseQueryData = await getSubspaceData(subspaceId);

    // Assert
    expect(
      responseQueryData.data?.lookup?.space?.about.profile.displayName
    ).toEqual(subspaceName);
  });

  test('should query subsubspace through subspace', async () => {
    // Act
    // Create Subsubspace
    const responseCreateSubsubspaceOnSubspace = await createSubspace(
      subsubspaceName,
      subsubspaceNameId,
      subspaceId
    );

    subsubspaceId =
      responseCreateSubsubspaceOnSubspace.data?.createSubspace.id ?? '';

    // Query Subsubspace data through Subspace query
    const responseQueryData = await getSubspaceData(subspaceId);

    // Assert
    expect(responseQueryData.data?.lookup?.space?.subspaces).toHaveLength(1);
    expect(
      responseQueryData.data?.lookup?.space?.subspaces[0].about.profile
        .displayName
    ).toEqual(subsubspaceName);
    expect(responseQueryData.data?.lookup?.space?.subspaces[0].nameID).toEqual(
      subsubspaceNameId
    );
    expect(responseQueryData.data?.lookup?.space?.subspaces[0].id).toEqual(
      subsubspaceId
    );
  });

  test('should create subsubspace and query the data', async () => {
    // Act
    // Create Subsubspace
    const responseCreateSubsubspaceOnSubspace = await createSubspace(
      subsubspaceName,
      subsubspaceNameId,
      subspaceId
    );

    const createSubsubspaceData =
      responseCreateSubsubspaceOnSubspace.data?.createSubspace;

    subsubspaceId =
      responseCreateSubsubspaceOnSubspace.data?.createSubspace.id ?? '';

    // Query Subsubspace data
    const requestQuerySubsubspace = await getSubspaceData(subsubspaceId);
    const requestSubsubspaceData = requestQuerySubsubspace.data?.lookup?.space;

    // Assert
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

  test('should update a subspace', async () => {
    // Arrange
    const about = {
      why: 'test vision update',
      who: 'test who update',
    };
    const response = await updateSpaceContext(
      subspaceId,
      subspaceName + 'change',
      about
    );
    const updatedSubspace = response.data?.updateSpace;

    // Act
    const getSubspaceDatas = await getSubspaceData(subspaceId);

    // Assert
    expect(updatedSubspace?.about.profile.displayName).toEqual(
      subspaceName + 'change'
    );
    expect(
      getSubspaceDatas.data?.lookup?.space?.about.profile.displayName
    ).toEqual(subspaceName + 'change');
    expect(getSubspaceDatas.data?.lookup?.space?.about.why).toEqual(about.why);
  });
});
