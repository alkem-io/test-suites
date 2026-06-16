import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

// Source: L0 with L1 subspace, NO L2 children
const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l2-auth-src',
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

// Source with L2 children (for blocked test)
const sourceWithL2Config: TestScenarioConfig = {
  name: 'move-l1-l2-auth-l2-src',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_MEMBER,
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSUBSPACE_MEMBER],
      },
      subspace: {
        collaboration: { addPostCallout: true },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER],
        },
      },
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l2-auth-tgt',
  space: {
    collaboration: { addPostCallout: true },
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
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER, TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L2 - authorization', () => {
  test('Platform Admin (GLOBAL_ADMIN) can execute move', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      sourceScenario.subspace.id,
      targetScenario.subspace.id,
      undefined,
      TestUser.GLOBAL_ADMIN
    );

    expect(res.data?.moveSpaceL1ToSpaceL2).toBeDefined();
    expect(res.data?.moveSpaceL1ToSpaceL2?.level).toEqual(SpaceLevel.L2);
  });

  test('authorization chain is rebuilt from target L1', async () => {
    const movedSpaceData = await getSpaceData(sourceScenario.subspace.id);
    const privileges =
      movedSpaceData.data?.lookup.space?.authorization?.myPrivileges ?? [];

    // Global admin should retain full CRUD privileges after move
    expect(privileges).toEqual(
      expect.arrayContaining(['CREATE', 'READ', 'UPDATE', 'DELETE'])
    );
  });
});

describe('Move L1 to L2 - unauthorized roles', () => {
  let authSourceScenario: OrganizationWithSpaceModel;
  let authTargetScenario: OrganizationWithSpaceModel;

  beforeAll(async () => {
    authSourceScenario = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l2-unauth-src',
    });
    authTargetScenario = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l2-unauth-tgt',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(authSourceScenario);
    await TestScenarioFactory.cleanUpBaseScenario(authTargetScenario);
  });

  test('Space Admin cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      authSourceScenario.subspace.id,
      authTargetScenario.subspace.id,
      undefined,
      TestUser.SPACE_ADMIN
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Space Member cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      authSourceScenario.subspace.id,
      authTargetScenario.subspace.id,
      undefined,
      TestUser.SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('Non-space member cannot execute cross-L0 move', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      authSourceScenario.subspace.id,
      authTargetScenario.subspace.id,
      undefined,
      TestUser.NON_SPACE_MEMBER
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });
});

describe('Move L1 to L2 - validation errors', () => {
  let valSourceWithL2: OrganizationWithSpaceModel;
  let valTargetScenario: OrganizationWithSpaceModel;
  let valSourceScenario: OrganizationWithSpaceModel;

  beforeAll(async () => {
    valSourceWithL2 = await TestScenarioFactory.createBaseScenario({
      ...sourceWithL2Config,
      name: 'move-l1-l2-val-l2-src',
    });
    valTargetScenario = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l2-val-tgt',
    });
    valSourceScenario = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l2-val-src',
    });
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(valSourceWithL2);
    await TestScenarioFactory.cleanUpBaseScenario(valTargetScenario);
    await TestScenarioFactory.cleanUpBaseScenario(valSourceScenario);
  });

  test('blocked when source L1 has L2 children (depth overflow)', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      valSourceWithL2.subspace.id,
      valTargetScenario.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  // skip until the requirement is cleared: api allows to move L1 as L2 to another L1 which is under the same L0 https://github.com/alkem-io/alkemio/issues/1814
  test.skip('cannot target L1 in same L0', async () => {
    // Cannot move L1 to become L2 under a sibling L1 in the same L0
    // (use convertSpaceL1ToSpaceL2 for same-L0 operations)
    const res = await moveSpaceL1ToSpaceL2(
      valSourceScenario.subspace.id, // source L1
      valSourceWithL2.subspace.id // target L1 in different L0
    );
    console.log('Move response for same-L0 target:', res);
    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move with invalid spaceL1ID', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      '00000000-0000-0000-0000-000000000000',
      valTargetScenario.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move with invalid targetSpaceL1ID', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      valSourceScenario.subspace.id,
      '00000000-0000-0000-0000-000000000000'
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('cannot move an L0 space (source must be L1)', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      valSourceScenario.space.id, // L0, not L1
      valTargetScenario.subspace.id
    );

    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });
});
