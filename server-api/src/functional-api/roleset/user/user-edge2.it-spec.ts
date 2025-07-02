import { getRoleSetMembersList } from '../roleset.request.params';
import { assignRoleToUser } from '../roles-request.params';

import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'assign-remove-leads-to-community',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      members: [
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    subspace: {
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        members: [TestUser.SUBSPACE_ADMIN, TestUser.SUBSUBSPACE_ADMIN],
      },
      subspace: {
        collaboration: {
          addTutorialCallouts: false,
        },
        community: {
          members: [TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Assign / Remove leads to community', () => {
  describe('Assign different users as lead to same community', () => {
    beforeAll(async () => {
      await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Member
      );

      await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Member
      );
    });

    test('Should assign second user as Space lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.spaceAdmin.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).not.toContain(
        '"Max limit of users reached for role \'lead\': 2, cannot assign new user."'
      );
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.spaceAdmin.email,
          }),
        ])
      );
    });

    test('Should throw error for assigning third user as Space lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.space.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.space.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).toContain(
        "Max limit of users reached for role 'lead': 2, cannot assign new user."
      );
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.qaUser.email,
          }),
        ])
      );
    });

    test('Should assign second user as Subspace lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.subspaceAdmin.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).not.toContain(
        '"Max limit of users reached for role \'lead\': 2, cannot assign new user."'
      );
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.subspaceAdmin.email,
          }),
        ])
      );
    });

    test('Should throw error for assigning third user as Subspace lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.subspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).toContain(
        "Max limit of users reached for role 'lead': 2, cannot assign new user."
      );
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.qaUser.email,
          }),
        ])
      );
    });

    test('Should assign second user as Subsubspace lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.subsubspaceAdmin.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).not.toContain(
        "Max limit of users reached for role 'lead': 2, cannot assign new user"
      );
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.subsubspaceAdmin.email,
          }),
        ])
      );
    });

    test('Should throw error for assigning third user as Subspace lead', async () => {
      // Act
      const res = await assignRoleToUser(
        TestUserManager.users.qaUser.id,
        baseScenario.subsubspace.community.roleSetId,
        RoleName.Lead
      );

      const roleSetMembers = await getRoleSetMembersList(
        baseScenario.subsubspace.community.roleSetId
      );
      const data = roleSetMembers.data?.lookup.roleSet?.leadUsers;

      // Assert
      expect(data).toHaveLength(2);
      expect(JSON.stringify(res)).toContain(
        "Max limit of users reached for role 'lead': 2, cannot assign new user"
      );
      expect(data).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: TestUserManager.users.qaUser.email,
          }),
        ])
      );
    });
  });
});
