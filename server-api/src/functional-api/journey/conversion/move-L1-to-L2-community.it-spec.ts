import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL2 } from './conversion.request.params';
import { getSpaceData } from '../space/space.request.params';
import {
  getRoleSetUsersInMemberRole,
  getRoleSetUsersInLeadRole,
  getRoleSetMembersList,
} from '@functional-api/roleset/roleset.request.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let sourceScenario: OrganizationWithSpaceModel;
let targetScenario: OrganizationWithSpaceModel;

const sourceConfig: TestScenarioConfig = {
  name: 'move-l1-l2-comm-src',
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
      // No L2 children
    },
  },
};

const targetConfig: TestScenarioConfig = {
  name: 'move-l1-l2-comm-tgt',
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
  sourceScenario =
    await TestScenarioFactory.createBaseScenario(sourceConfig);
  targetScenario =
    await TestScenarioFactory.createBaseScenario(targetConfig);

  await moveSpaceL1ToSpaceL2(
    sourceScenario.subspace.id,
    targetScenario.subspace.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

/** @testCase TC-1301, TC-1303 */
describe('Move L1 to L2 - community roles cleared', () => {
  test('all members are removed', async () => {
    const members = await getRoleSetUsersInMemberRole(
      sourceScenario.subspace.community.roleSetId
    );

    expect(members).toHaveLength(0);
  });

  test('all leads are removed', async () => {
    const leads = await getRoleSetUsersInLeadRole(
      sourceScenario.subspace.community.roleSetId
    );

    expect(leads).toHaveLength(0);
  });

  test('all admins are removed (key difference from same-L0 demotion)', async () => {
    const spaceData = await getSpaceData(sourceScenario.subspace.id);
    const admins =
      spaceData.data?.lookup.space?.community.roleSet.adminUsers ?? [];

    expect(admins).toHaveLength(0);
  });

  test('all member organizations are removed', async () => {
    const roleSetData = await getRoleSetMembersList(
      sourceScenario.subspace.community.roleSetId
    );
    const memberOrgs =
      roleSetData.data?.lookup.roleSet?.memberOrganizations ?? [];

    expect(memberOrgs).toHaveLength(0);
  });
});
