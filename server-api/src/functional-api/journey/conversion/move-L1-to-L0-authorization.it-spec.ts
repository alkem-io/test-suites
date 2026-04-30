import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { SpaceLevel } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-auth-src',
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

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l0-auth-tgt',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

beforeAll(async () => {
  sourceScenario =
    await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario =
    await TestScenarioFactory.createBaseScenario(targetConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

/** @testCase TC-1305 */
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
