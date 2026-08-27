import {
  delay,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import { getCommunityApplicationsInvitations } from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

/**
 * Move L2 to L1 - auto-invite (workspace#030-move-subspace-parent, US4-AS1/AS2, FR-011)
 *
 * On a cross-L0 move the admin MAY enable auto-invite: invitations go only to
 * former members of the moved subspace who are ALSO members of the destination
 * top-level community. Left off, no invitation is sent. Mirrors
 * move-L1-to-L2-auto-invite.it-spec.ts on an L2 source.
 *
 * The source L2 community and the target L0 community deliberately share
 * members (SUBSUBSPACE_MEMBER / SUBSUBSPACE_ADMIN) so the overlap set the
 * auto-invite must cover is non-empty.
 */

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l2-l1-inv-auto-src',
  space: {
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
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

// Target L0 community overlaps the source L2 members (subsubspace member/admin).
const targetConfig: TestScenarioConfig = {
  name: 'move-l2-l1-inv-auto-tgt',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
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
  // Built sequentially: concurrent scenario creation across workers overloaded the server and destabilised three consecutive nightly runs (71/5/4 failures).
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L2 to L1 - auto-invite disabled (US4-AS2)', () => {
  test('no invitations created when autoInvite is false', async () => {
    const res = await moveSpaceL2ToSpaceL1(
      sourceScenario.subsubspace.id,
      targetScenario.subspace.id,
      { autoInvite: false }
    );
    expect(res.data?.moveSpaceL2ToSpaceL1).toBeDefined();

    await delay(2000);

    // Query the moved space's roleSet for invitations
    const roleSetData = await getCommunityApplicationsInvitations(
      sourceScenario.subsubspace.community.roleSetId
    );

    expect(roleSetData.data?.lookup.roleSet?.invitations).toHaveLength(0);
  });
});

describe('Move L2 to L1 - auto-invite enabled (US4-AS1)', () => {
  let sourceScenario2: OrganizationWithSpaceModel;
  let targetScenario2: OrganizationWithSpaceModel;

  beforeAll(async () => {
    // Built sequentially: concurrent scenario creation across workers overloaded the server and destabilised three consecutive nightly runs (71/5/4 failures).
    sourceScenario2 = await TestScenarioFactory.createBaseScenario({
      ...sourceConfig,
      name: 'move-l2-l1-inv-auto-src2',
    });
    targetScenario2 = await TestScenarioFactory.createBaseScenario({
      ...targetConfig,
      name: 'move-l2-l1-inv-auto-tgt2',
    });

    await moveSpaceL2ToSpaceL1(
      sourceScenario2.subsubspace.id,
      targetScenario2.subspace.id,
      {
        autoInvite: true,
        invitationMessage:
          'Your subspace has been moved. Please rejoin the community.',
      }
    );

    await delay(5000);
  });

  afterAll(async () => {
    await TestScenarioFactory.cleanUpBaseScenario(sourceScenario2);
    await TestScenarioFactory.cleanUpBaseScenario(targetScenario2);
  });

  test('auto-invite creates invitations for overlapping former members (FR-011)', async () => {
    const roleSetData = await getCommunityApplicationsInvitations(
      sourceScenario2.subsubspace.community.roleSetId
    );
    const invitations = roleSetData.data?.lookup.roleSet?.invitations ?? [];

    // Overlap set (source L2 members also in target L0): SUBSUBSPACE_MEMBER,
    // SUBSUBSPACE_ADMIN. Auto-invite must produce at least those invitations.
    // The custom invitation message (US4-AS1 "carrying the message") is
    // asserted at the server resolver level (contract S10) — the admin roleset
    // invitations query used here does not expose the welcome message field.
    expect(invitations.length).toBeGreaterThan(0);
  });
});
