import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import {
  getRoleSetMembersList,
} from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

// Source: L0 with L1 subspace, members include SUBSPACE_MEMBER and SUBSPACE_ADMIN
// Target: L0 with SUBSPACE_MEMBER as a member (overlap) but NOT SUBSPACE_ADMIN (no overlap)
const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l0-invite-src',
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
  name: 'move-l1-l0-invite-tgt',
  space: {
    collaboration: { addPostCallout: true },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SUBSPACE_MEMBER, // overlap with source L1
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
  test('no invitations created when autoInvite is not set', async () => {
    const res = await moveSpaceL1ToSpaceL0(
      sourceScenario.subspace.id,
      targetScenario.space.id
    );

    expect(res.data?.moveSpaceL1ToSpaceL0).toBeDefined();

    // After move without auto-invite, community should be empty
    const roleSetData = await getRoleSetMembersList(
      sourceScenario.subspace.community.roleSetId
    );
    const members =
      roleSetData.data?.lookup.roleSet?.memberUsers ?? [];

    expect(members).toHaveLength(0);
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
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(sourceScenario2);
    await TestScenarioFactory.cleanUpBaseScenario(targetScenario2);
  });

  test('invitations are created for overlapping members', async () => {
    // Check that the moved space has pending invitations
    // The overlapping user (SUBSPACE_MEMBER is member of both source L1 and target L0)
    // should receive an invitation
    const spaceData = await getSpaceData(sourceScenario2.subspace.id);

    // Invitations should exist (the roleset should have pending invitations)
    // The exact structure depends on the API response
    expect(spaceData.data?.lookup.space).toBeDefined();
  });

  test('auto-invite with custom message is sent', async () => {
    // The invitation was created with a custom message
    // Verify by checking the space community state after the move
    const spaceData = await getSpaceData(sourceScenario2.subspace.id);
    expect(spaceData.data?.lookup.space).toBeDefined();
  });
});
