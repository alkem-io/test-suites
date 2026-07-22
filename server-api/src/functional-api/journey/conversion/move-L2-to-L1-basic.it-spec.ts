import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { stripProfileUrls } from '@utils/array.matcher';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Move L2 to L1 - basic (workspace#030-move-subspace-parent, US2-AS1 / US2-AS3)
 *
 * New server capability moveSpaceL2ToSpaceL1: moves an L2 subspace (Y) nested
 * under an L1 subspace of Space A so it becomes a child of an L1 subspace (B1)
 * belonging to a DIFFERENT top-level Space B. Y stays at level L2.
 *
 * Mirrors move-L1-to-L2-basic.it-spec.ts; the source hierarchy carries an
 * extra L2 level (space.subspace.subspace → subsubspace) and we move that
 * subsubspace, not the subspace.
 *
 * Covers: FR-003 (new capability, stays L2), FR-005 (structural consistency:
 * new parent, top-level-ancestor, sort order 0, account inherited), FR-007
 * (rejections: L1 source, L0/L2 target, same-L0 target, current parent) and
 * FR-012 / S9 (platform-admin gate). Contract test plan: S1, S2, S3, S4.
 */

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

// Source: L0 → L1 → L2 (Space A → A1 → Y). We move the L2 (subsubspace).
const sourceConfig: TestScenarioConfig = {
  name: 'move-l2-to-l1-src',
  space: {
    collaboration: { addPostCallout: true },
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
      collaboration: { addPostCallout: true },
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

// Target: L0 → L1 (Space B → B1). B1 is the destination parent.
const targetConfig: TestScenarioConfig = {
  name: 'move-l2-to-l1-tgt',
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

let subsubspaceBefore: Awaited<ReturnType<typeof getSpaceData>>;
let movedSpace:
  | NonNullable<
      Awaited<ReturnType<typeof moveSpaceL2ToSpaceL1>>['data']
    >['moveSpaceL2ToSpaceL1']
  | undefined;

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);

  // Capture state before move
  subsubspaceBefore = await getSpaceData(sourceScenario.subsubspace.id);

  // Execute cross-L0 L2→L1 move: Y (subsubspace) → under B1 (target subspace)
  const res = await moveSpaceL2ToSpaceL1(
    sourceScenario.subsubspace.id,
    targetScenario.subspace.id
  );
  movedSpace = res.data?.moveSpaceL2ToSpaceL1;
});

afterAll(async () => {
  // Source cleanup first: it deletes the moved space (sourceScenario.subsubspace.id,
  // now an L2 under the target B1) so the target subspace is child-free before
  // target cleanup runs.
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L2 to L1 - basic', () => {
  test('space stays at level L2 after the move (US2-AS1 / S4)', () => {
    expect(movedSpace?.level).toEqual(SpaceLevel.L2);
  });

  test('moved space appears in target L1 (B1) subspaces', async () => {
    const targetL1Data = await getSpaceData(targetScenario.subspace.id);
    const subspaceIds =
      targetL1Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(subspaceIds).toContain(sourceScenario.subsubspace.id);
  });

  test('moved space no longer nested under source L1 (A1)', async () => {
    const sourceL1Data = await getSpaceData(sourceScenario.subspace.id);
    const subspaceIds =
      sourceL1Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];

    expect(subspaceIds).not.toContain(sourceScenario.subsubspace.id);
  });

  test('collaboration content is preserved (excluding profile urls)', () => {
    expect(stripProfileUrls(movedSpace?.collaboration)).toEqual(
      stripProfileUrls(subsubspaceBefore.data?.lookup.space?.collaboration)
    );
  });

  test('about fields are preserved or updated correctly after cross-L0 move', () => {
    const aboutBefore = subsubspaceBefore.data?.lookup.space?.about;

    // authorization is preserved
    expect(movedSpace?.about.authorization).toEqual(aboutBefore?.authorization);

    // profile: id and displayName preserved (url points to new hierarchy)
    expect(movedSpace?.about.profile).toEqual(
      expect.objectContaining({
        id: aboutBefore?.profile?.id,
        displayName: aboutBefore?.profile?.displayName,
        description: aboutBefore?.profile?.description,
        references: aboutBefore?.profile?.references,
        tagline: aboutBefore?.profile?.tagline,
        tagsets: aboutBefore?.profile?.tagsets,
        location: aboutBefore?.profile?.location,
        authorization: aboutBefore?.profile?.authorization,
        storageBucket: aboutBefore?.profile?.storageBucket,
      })
    );

    // provider changes to target organization
    expect(movedSpace?.about.provider?.id).toEqual(
      targetScenario.organization.id
    );

    // who/why are preserved
    expect(movedSpace?.about.who).toEqual(aboutBefore?.who);
    expect(movedSpace?.about.why).toEqual(aboutBefore?.why);
  });

  test('visibility/privacy is preserved', () => {
    expect(movedSpace?.visibility).toEqual(
      subsubspaceBefore.data?.lookup.space?.visibility
    );
  });

  test('settings are preserved', () => {
    expect(movedSpace?.settings).toEqual(
      subsubspaceBefore.data?.lookup.space?.settings
    );
  });

  test('account is inherited from target L0 (FR-005)', async () => {
    const movedData = await getSpaceData(sourceScenario.subsubspace.id);
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
      sourceScenario.subsubspace.id
    );

    const sortedTarget =
      targetLicense.data?.lookup.space?.subscriptions?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ) ?? [];
    const sortedMoved =
      movedLicense.data?.lookup.space?.subscriptions?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ) ?? [];

    expect(sortedMoved).toEqual(sortedTarget);
  });

  test('moved space is first among target L1 (B1) subspaces (sort order 0)', async () => {
    const targetL1Data = await getSpaceData(targetScenario.subspace.id);
    const subspaces = targetL1Data.data?.lookup.space?.subspaces ?? [];
    const firstSubspaceId = subspaces[0]?.id;

    expect(firstSubspaceId).toEqual(sourceScenario.subsubspace.id);
  });
});

/**
 * Rejections (FR-007) and the platform-admin gate (FR-012 / S9). Each rejection
 * uses a fresh pair of scenarios so a failed move cannot pollute the assertions
 * of a later case, and asserts an error plus no observable change.
 */
describe('Move L2 to L1 - rejections and authorization', () => {
  let rejSource: OrganizationWithSpaceModel;
  let rejTarget: OrganizationWithSpaceModel;

  beforeAll(async () => {
    rejSource = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l2-l1-rej-src',
    });
    rejTarget = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l2-l1-rej-tgt',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(rejSource);
    await TestScenarioFactory.cleanUpBaseScenario(rejTarget);
  });

  test('rejects a non-admin caller — Space Admin (S9 / FR-012)', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      rejTarget.subspace.id,
      undefined,
      TestUser.SPACE_ADMIN
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);

    // No change: Y still nested under the source L1 (A1)
    const sourceL1Data = await getSpaceData(rejSource.subspace.id);
    const subspaceIds =
      sourceL1Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];
    expect(subspaceIds).toContain(rejSource.subsubspace.id);
  });

  test('rejects a non-admin caller — Non-space member (S9 / FR-012)', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      rejTarget.subspace.id,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects an L1 source — source must be L2 (S1)', async () => {
    // rejSource.subspace is an L1, not an L2 — invalid for this operation.
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subspace.id,
      rejTarget.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects an L0 source — source must be L2 (S1)', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.space.id,
      rejTarget.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects an L0 target — target must be L1 (S2)', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      rejTarget.space.id // L0, not L1
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects an L2 target — target must be L1 (S2)', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      rejSource.subsubspace.id // L2, not L1
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects a same-L0 target — only cross-L0 supported (US2-AS3 / S3)', async () => {
    // Target L1 lives inside the source's OWN top-level space (A1). Same-L0
    // lateral re-parenting is a deferred capability and must be rejected.
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      rejSource.subspace.id // the source's own current L1 parent, same L0
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);

    // No change: Y still nested under A1
    const sourceL1Data = await getSpaceData(rejSource.subspace.id);
    const subspaceIds =
      sourceL1Data.data?.lookup.space?.subspaces.map(s => s.id) ?? [];
    expect(subspaceIds).toContain(rejSource.subsubspace.id);
  });

  test('rejects an invalid spaceL2ID', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      '00000000-0000-0000-0000-000000000000',
      rejTarget.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('rejects an invalid targetSpaceL1ID', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      rejSource.subsubspace.id,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });
});
