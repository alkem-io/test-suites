import { TestUser } from '@alkemio/tests-lib';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { convertSpaceL2ToSpaceL1 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { SpaceLevel } from '@generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'convert-l2-to-l1',
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
      subspace: {
        collaboration: {
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
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

describe('Promoting of L2 subspace', () => {
  test('Conversion Subspace L2 to Space L1', async () => {
    // Arrange
    const before = await getSpaceData(baseScenario.subspace.id);

    // Act
    const res = await convertSpaceL2ToSpaceL1(baseScenario.subspace.id);
    const after = res.data?.convertSpaceL2ToSpaceL1;

    // Assert
    expect(before.data?.lookup.space?.collaboration.calloutsSet).toEqual(
      after?.collaboration.calloutsSet
    );

    expect(after?.collaboration.innovationFlow.states).toEqual(
      before.data?.lookup.space?.collaboration.innovationFlow.states
    );
    expect(before.data?.lookup.space?.visibility).toEqual(after?.visibility);
    expect(after?.level).toEqual(SpaceLevel.L1);

    expect(
      Array.isArray(before.data?.lookup.space?.community)
        ? before.data.lookup.space.community.slice().sort()
        : []
    ).toEqual(
      Array.isArray(after?.community) ? after.community.slice().sort() : []
    );
    expect(before.data?.lookup.space?.about).toEqual(after?.about);
    expect(before.data?.lookup.space?.account.host).toEqual(
      after?.account.host
    );
    expect(before.data?.lookup.space?.settings).toEqual(after?.settings);
    expect(before.data?.lookup.space?.subspaces).toEqual(after?.subspaces);
  });
});
