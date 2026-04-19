import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getCommunityApplicationsInvitations } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-invite-src',
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
  name: 'move-l1-l0-invite-tgt',
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

describe('Move L1 to L0 - auto-invite disabled', () => {
  test('no invitations created when autoInvite is false', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      sourceScenario.subspace.id,
      targetScenario.space.id,
      { autoInvite: false }
    );
    expect(res.data?.moveSpaceL1ToSpaceL0).toBeDefined();

    await delay(2000);

    // Query the moved space's roleSet for invitations
    const roleSetData = await getCommunityApplicationsInvitations(
      sourceScenario.subspace.community.roleSetId
    );

    expect(roleSetData.data?.lookup.roleSet?.invitations).toHaveLength(0);
  });
});

describe('Move L1 to L0 - auto-invite enabled', () => {
  let sourceScenario2: OrganizationWithSpaceModel;
  let targetScenario2: OrganizationWithSpaceModel;

  beforeAll(async () => {
    sourceScenario2 = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l1-l0-invite-src2',
    });
    targetScenario2 = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l1-l0-invite-tgt2',
    });

    await moveSpaceL1ToSpaceL0(
      sourceScenario2.subspace.id,
      targetScenario2.space.id,
      {
        autoInvite: true,
        invitationMessage: 'Your space has been moved. Please rejoin.',
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
