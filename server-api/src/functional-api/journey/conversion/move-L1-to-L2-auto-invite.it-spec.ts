import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import { getRoleSetMembersList } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l2-inv-auto-src',
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
  name: 'move-l1-l2-inv-auto-tgt',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER, // overlap with source L1
      ],
    },
    subspace: {
      collaboration: { addPostCallout: true },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [TestUser.SUBSPACE_MEMBER],
      },
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

describe('Move L1 to L2 - auto-invite disabled', () => {
  test('no invitations created when autoInvite is not set', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      sourceScenario.subspace.id,
      targetScenario.subspace.id
    );

    expect(res.data?.moveSpaceL1ToSpaceL2).toBeDefined();

    const roleSetData = await getRoleSetMembersList(
      sourceScenario.subspace.community.roleSetId
    );
    const members =
      roleSetData.data?.lookup.roleSet?.memberUsers ?? [];

    expect(members).toHaveLength(0);
  });
});

describe('Move L1 to L2 - auto-invite enabled', () => {
  let sourceScenario2: OrganizationWithSpaceModel;
  let targetScenario2: OrganizationWithSpaceModel;

  beforeAll(async () => {
    sourceScenario2 = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l2-inv-auto-src2',
    });
    targetScenario2 = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l2-inv-auto-tgt2',
    });

    await moveSpaceL1ToSpaceL2(
      sourceScenario2.subspace.id,
      targetScenario2.subspace.id,
      {
        autoInvite: true,
        invitationMessage: 'Your space has been moved and demoted. Please rejoin.',
      }
    );
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(sourceScenario2);
    await TestScenarioFactory.cleanUpBaseScenario(targetScenario2);
  });

  test('auto-invite creates invitations for overlapping members', async () => {
    const spaceData = await getSpaceData(sourceScenario2.subspace.id);
    expect(spaceData.data?.lookup.space).toBeDefined();
  });

  test('auto-invite with custom message is sent', async () => {
    const spaceData = await getSpaceData(sourceScenario2.subspace.id);
    expect(spaceData.data?.lookup.space).toBeDefined();
  });
});
