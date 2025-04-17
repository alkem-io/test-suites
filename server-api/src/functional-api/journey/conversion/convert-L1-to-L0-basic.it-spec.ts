import { TestUser } from '@alkemio/tests-lib';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { convertSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l1-to-l0-basic',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Promoting of L1 subspace', () => {
  test('Conversion Subspace L1 to Space L0 - basic scenario', async () => {
    // Arrange
    const spaceData = await getSpaceData(baseScenario.space.id);

    const subspaceBefore = await getSpaceData(baseScenario.subspace.id);
    const licenseSpace = await getSpaceLicenseSubscriptions(
      baseScenario.space.id
    );
    const sortedLicenseBefore =
      licenseSpace.data?.lookup.space?.subscriptions?.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    // Act
    const res = await convertSpaceL1ToSpaceL0(baseScenario.subspace.id);
    const licenseSubspaceAfterConversion = await getSpaceLicenseSubscriptions(
      baseScenario.subspace.id
    );
    const sortedLicenseAfter =
      licenseSubspaceAfterConversion.data?.lookup.space?.subscriptions.sort(
        (a, b) => a.name.localeCompare(b.name)
      );

    const subspaceAfter = res.data?.convertSpaceL1ToSpaceL0;

    // Assert L1 to L0
    expect(
      subspaceBefore.data?.lookup.space?.collaboration.calloutsSet
    ).toEqual(subspaceAfter?.collaboration.calloutsSet);

    expect(subspaceAfter?.collaboration.innovationFlow.states).toEqual(
      spaceData.data?.lookup.space?.collaboration.innovationFlow.states
    );

    expect(subspaceBefore.data?.lookup.space?.visibility).toEqual(
      subspaceAfter?.visibility
    );
    expect(subspaceAfter?.type).toEqual('SPACE');
    expect(sortedLicenseBefore).toEqual(sortedLicenseAfter);

    expect(
      Array.isArray(subspaceBefore.data?.lookup.space?.community)
        ? subspaceBefore.data.lookup.space.community.slice().sort()
        : []
    ).toEqual(
      Array.isArray(subspaceAfter?.community)
        ? subspaceAfter.community.slice().sort()
        : []
    );
    expect(subspaceBefore.data?.lookup.space?.about).toEqual(
      subspaceAfter?.about
    );
    expect(subspaceBefore.data?.lookup.space?.account.host).toEqual(
      subspaceAfter?.account.host
    );
    expect(subspaceBefore.data?.lookup.space?.settings).toEqual(
      subspaceAfter?.settings
    );
    expect(subspaceBefore.data?.lookup.space?.subspaces).toEqual(
      subspaceAfter?.subspaces
    );
  });
});
