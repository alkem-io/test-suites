import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceScenarioConfig: TestScenarioConfig = {
  name: 'move-l1-to-l0-source',
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

const targetScenarioConfig: TestScenarioConfig = {
  name: 'move-l1-to-l0-target',
  space: {
    collaboration: {
      addPostCallout: true,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER, TestUser.SPACE_ADMIN],
    },
  },
};

let subspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let movedSpace:
  | NonNullable<
      Awaited<ReturnType<typeof moveSpaceL1ToSpaceL0>>['data']
    >['moveSpaceL1ToSpaceL0']
  | undefined;

beforeAll(async () => {
  sourceScenario =
    await TestScenarioFactory.createBaseScenario(sourceScenarioConfig);
  targetScenario =
    await TestScenarioFactory.createBaseScenario(targetScenarioConfig);

  // Capture state before move
  subspaceBefore = await getSpaceData(sourceScenario.subspace.id);
  subsubspaceBefore = await getSpaceData(sourceScenario.subsubspace.id);

  // Execute cross-L0 move
  const res = await moveSpaceL1ToSpaceL0(
    sourceScenario.subspace.id,
    targetScenario.space.id
  );
  movedSpace = res.data?.moveSpaceL1ToSpaceL0;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L0 - basic', () => {
  test('space level remains L1', () => {
    expect(movedSpace?.level).toEqual(SpaceLevel.L1);
  });

  test('moved space appears in target L0 subspaces', async () => {
    const targetData = await getSpaceData(targetScenario.space.id);
    const targetSubspaceIds =
      targetData.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(targetSubspaceIds).toContain(sourceScenario.subspace.id);
  });

  test('moved space no longer in source L0 subspaces', async () => {
    const sourceData = await getSpaceData(sourceScenario.space.id);
    const sourceSubspaceIds =
      sourceData.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(sourceSubspaceIds).not.toContain(sourceScenario.subspace.id);
  });

  test('collaboration calloutsSet is preserved', () => {
    expect(movedSpace?.collaboration.calloutsSet).toEqual(
      subspaceBefore.data?.lookup.space?.collaboration.calloutsSet
    );
  });

  test('about/profile is preserved', () => {
    expect(movedSpace?.about).toEqual(
      subspaceBefore.data?.lookup.space?.about
    );
  });

  test('visibility/privacy is preserved', () => {
    expect(movedSpace?.visibility).toEqual(
      subspaceBefore.data?.lookup.space?.visibility
    );
  });

  test('settings are preserved', () => {
    expect(movedSpace?.settings).toEqual(
      subspaceBefore.data?.lookup.space?.settings
    );
  });

  test('L2 descendants move with parent', async () => {
    const movedSpaceData = await getSpaceData(sourceScenario.subspace.id);
    const childIds =
      movedSpaceData.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(childIds).toContain(sourceScenario.subsubspace.id);
  });

  test('L2 descendant level is unchanged', async () => {
    const l2Data = await getSpaceData(sourceScenario.subsubspace.id);

    expect(l2Data.data?.lookup.space?.level).toEqual(SpaceLevel.L2);
  });

  test('L2 descendant collaboration is preserved', async () => {
    const l2Data = await getSpaceData(sourceScenario.subsubspace.id);

    expect(l2Data.data?.lookup.space?.collaboration.calloutsSet).toEqual(
      subsubspaceBefore.data?.lookup.space?.collaboration.calloutsSet
    );
  });

  test('account is inherited from target L0', async () => {
    const movedSpaceData = await getSpaceData(sourceScenario.subspace.id);
    const targetData = await getSpaceData(targetScenario.space.id);

    expect(movedSpaceData.data?.lookup.space?.account.id).toEqual(
      targetData.data?.lookup.space?.account.id
    );
  });

  test('license subscriptions inherited from target L0', async () => {
    const targetLicense = await getSpaceLicenseSubscriptions(
      targetScenario.space.id
    );
    const movedLicense = await getSpaceLicenseSubscriptions(
      sourceScenario.subspace.id
    );

    const sortedTarget =
      targetLicense.data?.lookup.space?.subscriptions
        ?.sort((a, b) => a.name.localeCompare(b.name)) ?? [];
    const sortedMoved =
      movedLicense.data?.lookup.space?.subscriptions
        ?.sort((a, b) => a.name.localeCompare(b.name)) ?? [];

    expect(sortedMoved).toEqual(sortedTarget);
  });

  test('moved space is first in target L0 subspaces (sort order 0)', async () => {
    const targetData = await getSpaceData(targetScenario.space.id);
    const subspaces = targetData.data?.lookup.space?.subspaces ?? [];
    const firstSubspaceId = subspaces[0]?.id;

    expect(firstSubspaceId).toEqual(sourceScenario.subspace.id);
  });
});
