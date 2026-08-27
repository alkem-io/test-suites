import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  getGraphqlClient,
  sorted_read_readAbout_readLicense,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  SpaceLevel,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-auth-src',
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

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l0-auth-tgt',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

beforeAll(async () => {
  // Built sequentially: concurrent scenario creation across workers overloaded the server and destabilised three consecutive nightly runs (71/5/4 failures).
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L0 - authorization', () => {
  test('Platform Admin (GLOBAL_ADMIN) can execute move', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      sourceScenario.subspace.id,
      targetScenario.space.id,
      undefined,
      TestUser.GLOBAL_ADMIN
    );

    expect(res.data?.moveSpaceL1ToSpaceL0).toBeDefined();
    expect(res.data?.moveSpaceL1ToSpaceL0?.level).toEqual(SpaceLevel.L1);
  });

  test('authorization chain is rebuilt from target L0', async () => {
    const movedSpaceData = await getSpaceData(sourceScenario.subspace.id);
    const privileges =
      movedSpaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];

    // Global admin should retain full CRUD privileges after move
    expect(privileges).toEqual(
      expect.arrayContaining(['CREATE', 'READ', 'UPDATE', 'DELETE'])
    );
  });
});

describe('Move L1 to L0 - unauthorized roles', () => {
  let authSourceScenario: OrganizationWithSpaceModel;
  let authTargetScenario: OrganizationWithSpaceModel;

  beforeAll(async () => {
    authSourceScenario = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l0-unauth-src',
    });
    authTargetScenario = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l0-unauth-tgt',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(authSourceScenario);
    await TestScenarioFactory.cleanUpBaseScenario(authTargetScenario);
  });

  test('Space Admin cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      authSourceScenario.subspace.id,
      authTargetScenario.space.id,
      undefined,
      TestUser.SPACE_ADMIN
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Space Member cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      authSourceScenario.subspace.id,
      authTargetScenario.space.id,
      undefined,
      TestUser.SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Non-space member cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      authSourceScenario.subspace.id,
      authTargetScenario.space.id,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });
});

describe('Move L1 to L0 - validation errors', () => {
  let valSourceScenario: OrganizationWithSpaceModel;
  let valTargetScenario: OrganizationWithSpaceModel;

  beforeAll(async () => {
    valSourceScenario = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l0-val-src',
    });
    valTargetScenario = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l0-val-tgt',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(valSourceScenario);
    await TestScenarioFactory.cleanUpBaseScenario(valTargetScenario);
  });

  test('cannot move to same parent L0', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      valSourceScenario.subspace.id,
      valSourceScenario.space.id // same L0
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move with invalid spaceL1ID', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      '00000000-0000-0000-0000-000000000000',
      valTargetScenario.space.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move with invalid targetSpaceL0ID', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      valSourceScenario.subspace.id,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move an L0 space (source must be L1)', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      valSourceScenario.space.id, // L0 space, not L1
      valTargetScenario.space.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });
});

/**
 * Move L1 to L0 - privacy recompute (platform-level anonymous access)
 *
 * A cross-L0 move must RECOMPUTE the moved subtree's platformRolesAccess from
 * the NEW parent hierarchy before the authorization policy is re-applied — as
 * moveSpaceL2ToSpaceL1 and convertSpaceL1ToSpaceL0 already do. That persisted
 * jsonb field gates anonymous/guest/registered READ, and applyAuthorizationPolicy
 * only READS it (server: space.service.authorization.ts) — it never re-derives
 * it. If the move omits the recompute, a public L1 dragged into a PRIVATE L0
 * keeps stale anonymous READ (a visibility leak of a subspace inside a private
 * space), and a private→public move keeps a stale lockout.
 *
 * The recompute in moveSpaceL1ToSpaceL0 landed in alkem-io/server#6304 (fixes
 * #6303), so these pass against current server. They were red before that fix.
 * The two "after moving" tests each re-assert the anonymous precondition inline
 * before the move, so a scenario that fails to grant anonymous read fails LOUDLY
 * as a setup error instead of masking a regression with a vacuous [] → []. If
 * the recompute is ever reverted, the "after moving" assertions go red again.
 * Mirrors move-L2-to-L1-authorization.it-spec.ts.
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

// Source: public L0 → public L1 (the L1 leaf we move).
const privacyPublicSourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-priv-src',
  space: {
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
      ],
    },
    subspace: {
      settings: { privacy: { mode: SpacePrivacyMode.Public } },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

describe('Move L1 to L0 - privacy recompute (platform-level anonymous access)', () => {
  describe('public source → private destination L0 revokes anonymous read', () => {
    let sourceScenario: OrganizationWithSpaceModel;
    let targetScenario: OrganizationWithSpaceModel;

    const privateTargetConfig: TestScenarioConfig = {
      name: 'move-l1-l0-pub2priv-tgt',
      space: {
        settings: { privacy: { mode: SpacePrivacyMode.Private } },
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_MEMBER],
        },
      },
    };

    beforeAll(async () => {
      sourceScenario = await TestScenarioFactory.createBaseScenario({
        ...privacyPublicSourceConfig,
        name: 'move-l1-l0-pub2priv-src',
      });
      targetScenario =
        await TestScenarioFactory.createBaseScenario(privateTargetConfig);
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
      await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
    });

    test('anonymous can read the public L1 BEFORE the move', async () => {
      const privs = await anonymousSpacePrivileges(sourceScenario.subspace.id);
      expect(privs).toEqual(sorted_read_readAbout_readLicense);
    });

    test('after moving into the private L0, anonymous access is revoked entirely', async () => {
      // Precondition guard: the public source MUST grant anonymous read here,
      // else the post-move [] would be a vacuous pass that hides the leak.
      const before = await anonymousSpacePrivileges(sourceScenario.subspace.id);
      expect(
        before,
        'precondition: anonymous must be able to read the PUBLIC source L1 before the move — if this is [], the scenario is not establishing anonymous read and the test below would pass vacuously'
      ).toEqual(sorted_read_readAbout_readLicense);

      const res = await moveSpaceL1ToSpaceL0(
        sourceScenario.subspace.id,
        targetScenario.space.id
      );
      expect(res.data?.moveSpaceL1ToSpaceL0).toBeDefined();

      // Recomputed from the NEW (private) L0: anonymous loses ALL access. A
      // stale platformRolesAccess (no recompute) leaves anonymous READ on a
      // subspace inside a private space — the visibility leak this test guards.
      const privs = await anonymousSpacePrivileges(sourceScenario.subspace.id);
      expect(privs).toEqual([]);
    });
  });

  describe('private source → public destination L0 grants anonymous read', () => {
    let sourceScenario: OrganizationWithSpaceModel;
    let targetScenario: OrganizationWithSpaceModel;

    // Source L0 PRIVATE; the L1 leaf itself stays PUBLIC (via the spread), so
    // any anonymous access it has must come from the chain, not its own mode.
    const privateSourceConfig: TestScenarioConfig = {
      ...privacyPublicSourceConfig,
      name: 'move-l1-l0-priv2pub-src',
      space: {
        ...privacyPublicSourceConfig.space!,
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: { policy: CommunityMembershipPolicy.Applications },
        },
      },
    };

    const publicTargetConfig: TestScenarioConfig = {
      name: 'move-l1-l0-priv2pub-tgt',
      space: {
        settings: { privacy: { mode: SpacePrivacyMode.Public } },
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_MEMBER],
        },
      },
    };

    beforeAll(async () => {
      sourceScenario =
        await TestScenarioFactory.createBaseScenario(privateSourceConfig);
      targetScenario =
        await TestScenarioFactory.createBaseScenario(publicTargetConfig);
    });

    afterAll(async () => {
      await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
      await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
    });

    test('anonymous has no access to the public L1 under a private L0 BEFORE the move', async () => {
      const privs = await anonymousSpacePrivileges(sourceScenario.subspace.id);
      expect(privs).toEqual([]);
    });

    test('after moving into the public L0, anonymous can read (no stale lockout)', async () => {
      const res = await moveSpaceL1ToSpaceL0(
        sourceScenario.subspace.id,
        targetScenario.space.id
      );
      expect(res.data?.moveSpaceL1ToSpaceL0).toBeDefined();

      // Recomputed from the NEW (public) L0: the public L1 regains full READ. A
      // stale platformRolesAccess would keep it locked out under the old chain.
      const privs = await anonymousSpacePrivileges(sourceScenario.subspace.id);
      expect(privs).toEqual(sorted_read_readAbout_readLicense);
    });
  });
});
