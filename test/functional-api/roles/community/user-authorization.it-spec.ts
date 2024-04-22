import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  deleteSpaceCodegen,
  getUserCommunityPrivilegeToSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '../../journey/space/space.request.params';
import { TestUser } from '@test/utils';
import {
  sorted__create_read_update_delete_grant_addMember_apply,
  sorted__create_read_update_delete_grant_addMember_apply_invite,
  sorted__create_read_update_delete_grant_apply_invite,
  sorted__read_applyToCommunity,
} from '@test/non-functional/auth/my-privileges/common';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { removeCommunityRoleFromUserCodegen } from '../roles-request.params';

import { entitiesId } from './communications-helper';
import {
  CommunityMembershipPolicy,
  CommunityRole,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { getUserCommunityPrivilegeCodegen } from './community.request.params';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: { mode: SpacePrivacyMode.Public },
    membership: { policy: CommunityMembershipPolicy.Applications },
  });
  await createChallengeWithUsersCodegen(challengeName);
  await updateSpaceSettingsCodegen(entitiesId.challengeId, {
    membership: { policy: CommunityMembershipPolicy.Applications },
  });
  await createOpportunityWithUsersCodegen(opportunityName);
  await updateSpaceSettingsCodegen(entitiesId.opportunityId, {
    membership: { policy: CommunityMembershipPolicy.Applications },
  });
  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Verify COMMUNITY_ADD_MEMBER privilege', () => {
  describe('DDT role privilege to assign member to space', () => {
    // ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__applyToCommunity} - check if the privileges, that the role should have are: ["COMMUNITY_ADD_MEMBER", "COMMUNITY_APPLY", "COMMUNITY_INVITE", "CREATE", "DELETE", "GRANT", "READ", "UPDATE", ]
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply_invite}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_apply_invite}
      ${TestUser.HUB_MEMBER}         | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_MEMBER}   | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for space journey',
      async ({ user, myPrivileges }) => {
        const request = await getUserCommunityPrivilegeToSpaceCodegen(
          entitiesId.spaceId,
          user
        );
        const result =
          request?.data?.space?.spaceCommunity?.authorization?.myPrivileges;

        // Assert
        expect(result?.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to challenge', () => {
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.HUB_MEMBER}         | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.CHALLENGE_MEMBER}   | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for challenge journey',
      async ({ user, myPrivileges }) => {
        const request = await getUserCommunityPrivilegeCodegen(
          entitiesId.challengeCommunityId,
          user
        );
        const result =
          request.data?.lookup?.community?.authorization?.myPrivileges ?? [];

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to opportunity', () => {
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.HUB_MEMBER}         | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.CHALLENGE_MEMBER}   | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for opportunity journey',
      async ({ user, myPrivileges }) => {
        const request = await getUserCommunityPrivilegeCodegen(
          entitiesId.opportunityCommunityId,
          user
        );
        const result =
          request.data?.lookup?.community?.authorization?.myPrivileges ?? [];

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });
});
