import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  deleteSpaceCodegen,
  getUserCommunityPrivilegeToSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '../../journey/space/space.request.params';
import { TestUser } from '@test/utils';
import {
  sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC,
  sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC,
  sorted__read_applyToCommunity,
  sorted__read_applyToCommunity_invite_addVC,
} from '@test/non-functional/auth/my-privileges/common';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { removeRoleFromUser } from '../roles-request.params';

import { entitiesId } from './communications-helper';
import {
  CommunityMembershipPolicy,
  CommunityRole,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { getUserCommunityPrivilegeCodegen } from './roleset.request.params';

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
  await updateSpaceSettingsCodegen(entitiesId.challenge.id, {
    membership: { policy: CommunityMembershipPolicy.Applications },
    privacy: { mode: SpacePrivacyMode.Private },
  });
  await createOpportunityWithUsersCodegen(opportunityName);
  await updateSpaceSettingsCodegen(entitiesId.opportunity.id, {
    membership: { policy: CommunityMembershipPolicy.Applications },
    privacy: { mode: SpacePrivacyMode.Private },
  });
  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.opportunity.communityId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.space.communityId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunity.id);
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('Verify COMMUNITY_ADD_MEMBER privilege', () => {
  describe('DDT role privilege to assign member to space', () => {
    // ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__applyToCommunity} - check if the privileges, that the role should have are: ["COMMUNITY_ADD_MEMBER", "COMMUNITY_APPLY", "COMMUNITY_INVITE", "CREATE", "DELETE", "GRANT", "READ", "UPDATE", ]
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_apply_invite_addVC_accessVC}
      ${TestUser.HUB_MEMBER}         | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__read_applyToCommunity_invite_addVC}
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
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.HUB_MEMBER}         | ${['COMMUNITY_APPLY']}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.CHALLENGE_MEMBER}   | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__read_applyToCommunity_invite_addVC}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for challenge journey',
      async ({ user, myPrivileges }) => {
        const request = await getUserCommunityPrivilegeCodegen(
          entitiesId.challenge.communityId,
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
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.HUB_MEMBER}         | ${['COMMUNITY_APPLY']}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.CHALLENGE_MEMBER}   | ${['COMMUNITY_APPLY']}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_apply_invite_addVC_accessVC}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for opportunity journey',
      async ({ user, myPrivileges }) => {
        const request = await getUserCommunityPrivilegeCodegen(
          entitiesId.opportunity.communityId,
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
