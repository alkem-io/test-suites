import {
  sorted_read_readAbout_readLicense,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  getGraphqlClient,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpaceLevel,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Move L2 to L1 - authorization & privacy recompute
 * (workspace#030-move-subspace-parent)
 *
 * Covers:
 * - FR-012 / S9: the operation is platform-admin-only at the API. GLOBAL_ADMIN
 *   succeeds; SPACE_ADMIN / SPACE_MEMBER / NON_SPACE_MEMBER are rejected.
 * - FR-006 / US2-AS4 / SC-003 / contract S7 (decision log D-5): on every move
 *   the moved subspace's platform-level access rules are RECOMPUTED from the
 *   NEW parent chain before the authorization policy is re-applied. We assert
 *   the RECOMPUTED anonymous access on a differing-privacy pair — not merely
 *   that a re-apply ran:
 *     * public source → private destination chain ⇒ anonymous read is revoked
 *       (drops to READ_ABOUT only): no residual visibility from the old chain.
 *     * private source → public destination chain ⇒ anonymous can read: no
 *       lockout from stale rules of the old chain.
 *
 * The anonymous probe mirrors graphql-guard-public-private-access.it-spec.ts:
 * call graphqlErrorWrapper without a role and omit the Authorization header.
 */

const anonymousSpacePrivileges = async (spaceId: string) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.PrivateSpaceData(
      { nameId: spaceId },
      authToken ? { authorization: `Bearer ${authToken}` } : {}
    );
  const request = await graphqlErrorWrapper(callback);
  return request?.data?.lookup?.space?.authorization?.myPrivileges?.sort() ?? [];
};

// Source hierarchy: L0 → L1 → L2, all PUBLIC.
const publicSourceConfig: TestScenarioConfig = {
  name: 'move-l2-l1-auth-src',
  space: {
    collaboration: { addPostCallout: true },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
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
      collaboration: { addPostCallout: true },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
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
        collaboration: { addPostCallout: true },
        settings: { privacy: { mode: SpacePrivacyMode.Public } },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

// Target hierarchy: L0 → L1, PUBLIC.
const publicTargetConfig: TestScenarioConfig = {
  name: 'move-l2-l1-auth-tgt',
  space: {
    collaboration: { addPostCallout: true },
    settings: { privacy: { mode: SpacePrivacyMode.Public } },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

describe('Move L2 to L1 - platform-admin gate (FR-012 / S9)', () => {
  let sourceScenario: OrganizationWithSpaceModel;
  let targetScenario: OrganizationWithSpaceModel;

  beforeAll(async () => {
    sourceScenario = await TestScenarioFactory.createBaseScenario({
      ...publicSourceConfig,
      name: 'move-l2-l1-gate-src',
    });
    targetScenario = await TestScenarioFactory.createBaseScenario({
      ...publicTargetConfig,
      name: 'move-l2-l1-gate-tgt',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
    await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
  });

  test('Space Admin cannot execute the move', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      sourceScenario.subsubspace.id,
      targetScenario.subspace.id,
      undefined,
      TestUser.SPACE_ADMIN
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Space Member cannot execute the move', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      sourceScenario.subsubspace.id,
      targetScenario.subspace.id,
      undefined,
      TestUser.SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Non-space member cannot execute the move', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      sourceScenario.subsubspace.id,
      targetScenario.subspace.id,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Platform Admin (GLOBAL_ADMIN) can execute the move; stays L2', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      sourceScenario.subsubspace.id,
      targetScenario.subspace.id,
      undefined,
      TestUser.GLOBAL_ADMIN
    );

    expect(res.data?.moveSpaceL2ToSpaceL1).toBeDefined();
    expect(res.data?.moveSpaceL2ToSpaceL1?.level).toEqual(SpaceLevel.L2);

    // Authorization chain rebuilt from the target L1: admin retains full CRUD.
    const movedSpaceData = await getSpaceData(sourceScenario.subsubspace.id);
    const privileges =
      movedSpaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];
    expect(privileges).toEqual(
      expect.arrayContaining(['CREATE', 'READ', 'UPDATE', 'DELETE'])
    );
  });
});

describe('Move L2 to L1 - privacy recompute (FR-006 / US2-AS4 / SC-003 / S7)', () => {
  describe('public source → private destination chain revokes anonymous read', () => {
    let sourceScenario: OrganizationWithSpaceModel;
    let targetScenario: OrganizationWithSpaceModel;

    // Destination top-level chain is PRIVATE.
    const privateTargetConfig: TestScenarioConfig = {
      ...publicTargetConfig,
      name: 'move-l2-l1-priv-tgt',
      space: {
        ...publicTargetConfig.space!,
        settings: { privacy: { mode: SpacePrivacyMode.Private } },
        subspace: {
          ...publicTargetConfig.space!.subspace!,
          settings: { privacy: { mode: SpacePrivacyMode.Private } },
        },
      },
    };

    beforeAll(async () => {
      sourceScenario = await TestScenarioFactory.createBaseScenario({
        ...publicSourceConfig,
        name: 'move-l2-l1-pub2priv-src',
      });
      targetScenario =
        await TestScenarioFactory.createBaseScenario(privateTargetConfig);
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
      await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
    });

    test('anonymous can read the public L2 BEFORE the move', async () => {
      const privs = await anonymousSpacePrivileges(
        sourceScenario.subsubspace.id
      );
      expect(privs).toEqual(sorted_read_readAbout_readLicense);
    });

    test('after moving into the private chain, anonymous access is revoked entirely (recomputed access)', async () => {
      const res = await moveSpaceL2ToSpaceL1(
        sourceScenario.subsubspace.id,
        targetScenario.subspace.id
      );
      expect(res.data?.moveSpaceL2ToSpaceL1).toBeDefined();

      // Recomputed platform-access from the NEW (private) chain: a subspace's
      // anonymous access is gated behind the parent's anonymous READ. The new
      // parent chain (private L1 under private L0) grants anonymous nothing, so
      // the moved L2 — even though its own privacy mode is still public — loses
      // ALL anonymous access, not merely READ. No residual visibility.
      const privs = await anonymousSpacePrivileges(
        sourceScenario.subsubspace.id
      );
      expect(privs).toEqual([]);
    });
  });

  describe('private source → public destination chain grants anonymous read', () => {
    let sourceScenario: OrganizationWithSpaceModel;
    let targetScenario: OrganizationWithSpaceModel;

    // Source L0 + L1 are PRIVATE; the moved L2 leaf itself stays PUBLIC. This
    // isolates the recompute: any anonymous access the L2 has must come from
    // its parent chain, not its own privacy mode — so BEFORE (private chain) it
    // has none, and AFTER (public chain) it regains full READ. Mirrors block 1.
    const privateSourceConfig: TestScenarioConfig = {
      ...publicSourceConfig,
      name: 'move-l2-l1-priv2pub-src',
      space: {
        ...publicSourceConfig.space!,
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: { policy: CommunityMembershipPolicy.Applications },
        },
        subspace: {
          ...publicSourceConfig.space!.subspace!,
          settings: { privacy: { mode: SpacePrivacyMode.Private } },
          // L2 leaf left PUBLIC (inherits publicSourceConfig's subsubspace).
        },
      },
    };

    beforeAll(async () => {
      sourceScenario =
        await TestScenarioFactory.createBaseScenario(privateSourceConfig);
      targetScenario = await TestScenarioFactory.createBaseScenario({
        ...publicTargetConfig,
        name: 'move-l2-l1-priv2pub-tgt',
      });
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
      await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
    });

    test('anonymous has no access to the public L2 under a private chain BEFORE the move', async () => {
      // The L2 is public, but its private parent chain gates anonymous access
      // to nothing — so anonymous sees the L2 not at all.
      const privs = await anonymousSpacePrivileges(
        sourceScenario.subsubspace.id
      );
      expect(privs).toEqual([]);
    });

    test('after moving into the public chain, anonymous can read (no stale lockout)', async () => {
      const res = await moveSpaceL2ToSpaceL1(
        sourceScenario.subsubspace.id,
        targetScenario.subspace.id
      );
      expect(res.data?.moveSpaceL2ToSpaceL1).toBeDefined();

      // Recomputed platform-access from the NEW (public) chain: the public L2
      // regains full READ — no lockout from stale rules of the old private
      // chain, and no partial state.
      const privs = await anonymousSpacePrivileges(
        sourceScenario.subsubspace.id
      );
      expect(privs).toEqual(sorted_read_readAbout_readLicense);
    });
  });
});
