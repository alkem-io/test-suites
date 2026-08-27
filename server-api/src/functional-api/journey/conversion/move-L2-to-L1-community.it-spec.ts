import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL2ToSpaceL1 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import {
  getRoleSetUsersInMemberRole,
  getRoleSetUsersInLeadRole,
  getRoleSetMembersList,
} from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

/**
 * Move L2 to L1 - community roles cleared
 * (workspace#030-move-subspace-parent, US2-AS1 / FR-004 / SC-002 / contract S5)
 *
 * Every cross-L0 move is wipe-all: the moved L2 subspace's community loses ALL
 * roles — members, leads and admins — because only cross-L0 ships (decision
 * log D-1/D-4). Mirrors move-L1-to-L2-community.it-spec.ts on an L2 source.
 */

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l2-l1-comm-src',
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

const targetConfig: TestScenarioConfig = {
  name: 'move-l2-l1-comm-tgt',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
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
  // Built sequentially: concurrent scenario creation across workers overloaded the server and destabilised three consecutive nightly runs (71/5/4 failures).
  sourceScenario = await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario = await TestScenarioFactory.createBaseScenario(targetConfig);

  await moveSpaceL2ToSpaceL1(
    sourceScenario.subsubspace.id,
    targetScenario.subspace.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L2 to L1 - community roles cleared', () => {
  test('all members are removed (FR-004 / SC-002)', async () => {
    const members = await getRoleSetUsersInMemberRole(
      sourceScenario.subsubspace.community.roleSetId
    );

    expect(members).toHaveLength(0);
  });

  test('all leads are removed (FR-004)', async () => {
    const leads = await getRoleSetUsersInLeadRole(
      sourceScenario.subsubspace.community.roleSetId
    );

    expect(leads).toHaveLength(0);
  });

  test('all admins are removed — wipe-all, incl. admins (S5 / FR-004)', async () => {
    const spaceData = await getSpaceData(sourceScenario.subsubspace.id);
    const admins =
      spaceData.data?.lookup.space?.community.roleSet.adminUsers ?? [];

    expect(admins).toHaveLength(0);
  });

  test('all member organizations are removed (FR-004)', async () => {
    const roleSetData = await getRoleSetMembersList(
      sourceScenario.subsubspace.community.roleSetId
    );
    const memberOrgs =
      roleSetData.data?.lookup.roleSet?.memberOrganizations ?? [];

    expect(memberOrgs).toHaveLength(0);
  });
});
