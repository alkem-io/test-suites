import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getSpaceLicenseSubscriptions } from '@functional-api/license/license.params.request';
import { stripProfileUrls, collectProfileUrls } from '@utils/array.matcher';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const { ALKEMIO_BASE_URL } = process.env;

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

// Source: L0 with L1 subspace (NO L2 children — required for L1→L2 move)
const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-to-l2-src',
  space: {
    collaboration: {
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
  // Independent scenarios (distinct names, no shared state) — build concurrently.
  [sourceScenario, targetScenario] = await Promise.all([
    TestScenarioFactory.createBaseScenario(sourceConfig),
    TestScenarioFactory.createBaseScenario(targetConfig),
  ]);

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
  // Source cleanup first: it deletes the moved space (sourceScenario.subspace.id, now an L2
  // under the target) so the target subspace is child-free before target cleanup runs.
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

  test('collaboration is preserved (excluding profile urls)', () => {
    expect(stripProfileUrls(movedSpace?.collaboration)).toEqual(
      stripProfileUrls(subspaceBefore.data?.lookup.space?.collaboration)
    );
  });

  test('about fields are preserved or updated correctly after cross-L0 move', () => {
    const aboutBefore = subspaceBefore.data?.lookup.space?.about;

    // authorization is preserved
    expect(movedSpace?.about.authorization).toEqual(aboutBefore?.authorization);

    // profile: id and displayName preserved, url points to new hierarchy
    expect(movedSpace?.about.profile).toEqual(
      expect.objectContaining({
        id: aboutBefore?.profile?.id,
        displayName: aboutBefore?.profile?.displayName,
        description: aboutBefore?.profile?.description,
        url: `${ALKEMIO_BASE_URL}/${targetScenario.space.nameId}/challenges/${targetScenario.subspace.nameId}/opportunities/${sourceScenario.subspace.nameId}`,
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

    // metrics reset after cross-L0 move
    expect(movedSpace?.about.metrics?.[0].value).toEqual('0');

    // who/why are preserved
    expect(movedSpace?.about.who).toEqual(aboutBefore?.who);
    expect(movedSpace?.about.why).toEqual(aboutBefore?.why);
  });

  test('all entity profile urls reflect the new L2 hierarchy after cross-L0 move', () => {
    const urlsBefore = collectProfileUrls(subspaceBefore.data?.lookup.space);
    const urlsAfter = collectProfileUrls(movedSpace);

    const targetSpaceNameId = targetScenario.space.nameId;
    const targetParentNameId = targetScenario.subspace.nameId;
    const movedNameId = sourceScenario.subspace.nameId;
    const targetOrgNameId = targetScenario.organization.nameId;
    const expectedEntityUrl = `${ALKEMIO_BASE_URL}/${targetSpaceNameId}/challenges/${targetParentNameId}/opportunities/${movedNameId}`;

    // structural invariants: same paths present, no empties
    expect(urlsAfter.map(e => e.path).sort()).toEqual(
      urlsBefore.map(e => e.path).sort()
    );
    for (const entry of urlsAfter) {
      expect(entry.url, `${entry.path} should not be empty`).not.toBe('');
    }

    const before = new Map(urlsBefore.map(e => [e.path, e.url]));
    const after = new Map(urlsAfter.map(e => [e.path, e.url]));

    // host org URL points at target organization
    expect(
      after.get('account.host.profile.url'),
      'account.host.profile.url should point at target organization'
    ).toBe(`${ALKEMIO_BASE_URL}/organization/${targetOrgNameId}`);

    // about URL reflects new L0 → L1 (challenge) → L2 (opportunity) hierarchy
    expect(
      after.get('about.profile.url'),
      'about.profile.url should reflect new L2 hierarchy'
    ).toBe(expectedEntityUrl);

    // innovation flow URL shares the same entity prefix
    expect(
      after.get('collaboration.innovationFlow.profile.url'),
      'innovationFlow.profile.url should reflect new L2 hierarchy'
    ).toBe(expectedEntityUrl);

    // callout URLs: prefix updated, trailing slug preserved
    for (const [path, urlAfter] of after.entries()) {
      if (
        !path.startsWith('collaboration.calloutsSet.callouts[') ||
        !path.endsWith('.framing.profile.url')
      ) {
        continue;
      }
      const urlBefore = before.get(path);
      const slug = urlBefore?.split('/collaboration/')[1];
      expect(
        slug,
        `could not extract callout slug from before-url ${path}`
      ).toBeTruthy();
      expect(
        urlAfter,
        `${path} should reflect new hierarchy with preserved slug "${slug}"`
      ).toBe(`${expectedEntityUrl}/collaboration/${slug}`);
    }
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
      targetLicense.data?.lookup.space?.subscriptions?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ) ?? [];
    const sortedMoved =
      movedLicense.data?.lookup.space?.subscriptions?.sort((a, b) =>
        a.name.localeCompare(b.name)
      ) ?? [];

    expect(sortedMoved).toEqual(sortedTarget);
  });

  test('moved space is first in target L1 subspaces (sort order 0)', async () => {
    const targetL1Data = await getSpaceData(targetScenario.subspace.id);
    const subspaces = targetL1Data.data?.lookup.space?.subspaces ?? [];
    const firstSubspaceId = subspaces[0]?.id;

    expect(firstSubspaceId).toEqual(sourceScenario.subspace.id);
  });
});
