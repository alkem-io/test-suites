import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

// Source: L0 with L1 subspace (NO L2 children — required for L1→L2 move)
const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-to-l2-src',
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
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
      // No subspace (no L2 children) — required for this move type
    },
  },
};

// Target: L0 with L1 subspace (the L1 is the target parent)
const targetConfig: TestScenarioConfig = {
  name: 'move-l1-to-l2-tgt',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

let subspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let movedSpace:
  | NonNullable<
      Awaited<ReturnType<typeof moveSpaceL1ToSpaceL2>>['data']
    >['moveSpaceL1ToSpaceL2']
  | undefined;

beforeAll(async () => {
  sourceScenario =
    await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario =
    await TestScenarioFactory.createBaseScenario(targetConfig);

  // Capture state before move
  subspaceBefore = await getSpaceData(sourceScenario.subspace.id);

  // Execute cross-L0 move + demotion
  const res = await moveSpaceL1ToSpaceL2(
    sourceScenario.subspace.id,
    targetScenario.subspace.id
  );
  movedSpace = res.data?.moveSpaceL1ToSpaceL2;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L2 - basic', () => {
  test('space level is demoted to L2', () => {
    expect(movedSpace?.level).toEqual(SpaceLevel.L2);
  });

  test('moved space appears in target L1 subspaces', async () => {
    const targetL1Data = await getSpaceData(targetScenario.subspace.id);
    const subspaceIds =
      targetL1Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(subspaceIds).toContain(sourceScenario.subspace.id);
  });

  test('moved space no longer in source L0 subspaces', async () => {
    const sourceL0Data = await getSpaceData(sourceScenario.space.id);
    const subspaceIds =
      sourceL0Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(subspaceIds).not.toContain(sourceScenario.subspace.id);
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

  test('account is inherited from target L0', async () => {
    const movedData = await getSpaceData(sourceScenario.subspace.id);
    const targetL0Data = await getSpaceData(targetScenario.space.id);

    expect(movedData.data?.lookup.space?.account.id).toEqual(
      targetL0Data.data?.lookup.space?.account.id
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

  test('moved space is first in target L1 subspaces (sort order 0)', async () => {
    const targetL1Data = await getSpaceData(targetScenario.subspace.id);
    const subspaces = targetL1Data.data?.lookup.space?.subspaces ?? [];
    const firstSubspaceId = subspaces[0]?.id;

    expect(firstSubspaceId).toEqual(sourceScenario.subspace.id);
  });
});
