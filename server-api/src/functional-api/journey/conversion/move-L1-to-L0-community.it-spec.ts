import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { moveSpaceL1ToSpaceL0 } from './conversion.request.params';
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
  name: 'move-l1-l0-community-src',
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
  name: 'move-l1-l0-community-tgt',
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

  // Execute cross-L0 move
  await moveSpaceL1ToSpaceL0(
    sourceScenario.subspace.id,
    targetScenario.space.id
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(sourceScenario);
  await TestScenarioFactory.cleanUpBaseScenario(targetScenario);
});

describe('Move L1 to L0 - community roles cleared', () => {
  test('all members are removed from moved space', async () => {
    const members = await getRoleSetUsersInMemberRole(
      sourceScenario.subspace.community.roleSetId
    );

    expect(members).toHaveLength(0);
  });

  test('all leads are removed from moved space', async () => {
    const leads = await getRoleSetUsersInLeadRole(
      sourceScenario.subspace.community.roleSetId
    );

    expect(leads).toHaveLength(0);
  });

  test('all admins are removed from moved space', async () => {
    const spaceData = await getSpaceData(sourceScenario.subspace.id);
    const admins =
      spaceData.data?.lookup.space?.community.roleSet.adminUsers ?? [];

    expect(admins).toHaveLength(0);
  });

  test('all member organizations are removed from moved space', async () => {
    const roleSetData = await getRoleSetMembersList(
      sourceScenario.subspace.community.roleSetId
    );
    const memberOrgs =
      roleSetData.data?.lookup.roleSet?.memberOrganizations ?? [];

    expect(memberOrgs).toHaveLength(0);
  });

  test('L2 descendant members are also cleared', async () => {
    const members = await getRoleSetUsersInMemberRole(
      sourceScenario.subsubspace.community.roleSetId
    );

    expect(members).toHaveLength(0);
  });

  test('L2 descendant admins are also cleared', async () => {
    const spaceData = await getSpaceData(sourceScenario.subsubspace.id);
    const admins =
      spaceData.data?.lookup.space?.community.roleSet.adminUsers ?? [];

    expect(admins).toHaveLength(0);
  });
});
