import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getCommunityApplicationsInvitations } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l2-inv-auto-src',
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
  name: 'move-l1-l2-inv-auto-tgt',
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

beforeAll(async () => {
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L2 - auto-invite disabled', () => {
  test('no invitations created when autoInvite is false', async () => {
    const res = await moveSpaceL1ToSpaceL2(
      sourceScenario.subspace.id,
      targetScenario.subspace.id,
      { autoInvite: false }
    );
    expect(res.data?.moveSpaceL1ToSpaceL2).toBeDefined();

    await delay(2000);

    // Query the moved space's roleSet for invitations
    const roleSetData = await getCommunityApplicationsInvitations(
      sourceScenario.subspace.community.roleSetId
    );

    expect(roleSetData.data?.lookup.roleSet?.invitations).toHaveLength(0);
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
        invitationMessage:
          'Your space has been moved and demoted. Please rejoin.',
      }
    );

    await delay(5000);
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(sourceScenario2);
    await TestScenarioFactory.cleanUpBaseScenario(targetScenario2);
  });

  test('auto-invite creates invitations for overlapping members', async () => {
    // Query the moved space's roleSet for invitations
    const roleSetData = await getCommunityApplicationsInvitations(
      sourceScenario2.subspace.community.roleSetId
    );

    expect(roleSetData.data?.lookup.roleSet?.invitations).toHaveLength(3);
  });
});
