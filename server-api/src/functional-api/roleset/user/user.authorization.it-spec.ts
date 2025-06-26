import { getRoleSetUserPrivilege } from '../../journey/space/space.request.params';
import {
  sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC,
  sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization,
  sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC,
  sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_assignOrganization,
  sorted__read_applyToRoleSet,
  sorted__read_applyToRoleSet_invite_addVC,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import {
  assignPlatformRole,
  removePlatformRole,
} from '@functional-api/platform/authorization-platform-mutation';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  CommunityMembershipPolicy,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'access-user-authorizations',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN, TestUser.GLOBAL_BETA_TESTER],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.GLOBAL_BETA_TESTER,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: { mode: SpacePrivacyMode.Public },
      membership: { policy: CommunityMembershipPolicy.Applications },
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
      settings: {
        privacy: { mode: SpacePrivacyMode.Private },
        membership: { policy: CommunityMembershipPolicy.Applications },
      },
      subspace: {
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
        settings: {
          privacy: { mode: SpacePrivacyMode.Private },
          membership: { policy: CommunityMembershipPolicy.Applications },
        },
      },
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  await assignPlatformRole(
    TestUser.NON_SPACE_MEMBER,
    RoleName.PlatformBetaTester
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  await removePlatformRole(
    TestUser.NON_SPACE_MEMBER,
    RoleName.PlatformBetaTester
  );
});

describe('Verify ROLESET_ENTRY_ROLE_ASSIGN privilege', () => {
  describe('DDT role privilege to assign member to space', () => {
    // to the user 'NON_SPACE_MEMBER'is assigned the role 'PlatformBetaTester' to verify the privileges of beta tester not admin of the space
    // ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__applyToCommunity} - check if the privileges, that the role should have are: ["ROLESET_ENTRY_ROLE_ASSIGN", "ROLESET_ENTRY_ROLE_APPLY", "ROLESET_ENTRY_ROLE_INVITE", "CREATE", "DELETE", "GRANT", "READ", "UPDATE", ]
    // Arrange
    test.each`
      user                             | myPrivileges
      ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC}
      ${TestUser.GLOBAL_BETA_TESTER}   | ${sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.NON_SPACE_MEMBER}     | ${sorted__read_applyToRoleSet}
      ${TestUser.SPACE_MEMBER}         | ${sorted__read_applyToRoleSet}
      ${TestUser.SUBSPACE_ADMIN}       | ${sorted__read_applyToRoleSet_invite_addVC}
      ${TestUser.SUBSPACE_MEMBER}      | ${sorted__read_applyToRoleSet}
      ${TestUser.SUBSUBSPACE_ADMIN}    | ${sorted__read_applyToRoleSet}
      ${TestUser.SUBSUBSPACE_MEMBER}   | ${sorted__read_applyToRoleSet}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for space journey',
      async ({ user, myPrivileges }) => {
        const request = await getRoleSetUserPrivilege(
          baseScenario.space.community.roleSetId,
          user
        );
        const result =
          request?.data?.lookup?.roleSet?.authorization?.myPrivileges;

        // Assert
        expect(result?.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to subspace', () => {
    // Arrange
    test.each`
      user                             | myPrivileges
      ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.SPACE_MEMBER}         | ${['ROLESET_ENTRY_ROLE_APPLY']}
      ${TestUser.SUBSPACE_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.SUBSPACE_MEMBER}      | ${sorted__read_applyToRoleSet}
      ${TestUser.SUBSUBSPACE_ADMIN}    | ${sorted__read_applyToRoleSet_invite_addVC}
      ${TestUser.SUBSUBSPACE_MEMBER}   | ${sorted__read_applyToRoleSet}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for subspace journey',
      async ({ user, myPrivileges }) => {
        const request = await getRoleSetUserPrivilege(
          baseScenario.subspace.community.roleSetId,
          user
        );
        const result =
          request.data?.lookup?.roleSet?.authorization?.myPrivileges ?? [];

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to subsubspace', () => {
    // ${TestUser.SPACE_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC} - skipped until bug is fixed: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/server/4860

    // Arrange
    test.each`
      user                             | myPrivileges
      ${TestUser.GLOBAL_ADMIN}         | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.GLOBAL_SUPPORT_ADMIN} | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC_assignOrganization}
      ${TestUser.SPACE_MEMBER}         | ${['ROLESET_ENTRY_ROLE_APPLY']}
      ${TestUser.SUBSPACE_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.SUBSPACE_MEMBER}      | ${['ROLESET_ENTRY_ROLE_APPLY']}
      ${TestUser.SUBSUBSPACE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.SUBSUBSPACE_MEMBER}   | ${sorted__read_applyToRoleSet}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for subsubspace journey',
      async ({ user, myPrivileges }) => {
        const request = await getRoleSetUserPrivilege(
          baseScenario.subsubspace.community.roleSetId,
          user
        );
        const result =
          request.data?.lookup?.roleSet?.authorization?.myPrivileges ?? [];

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });
});
