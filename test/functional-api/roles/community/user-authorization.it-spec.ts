import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpaceWithUsers,
  createChallengeWithUsers,
  createOpportunityWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { removeChallenge } from '../../integration/challenge/challenge.request.params';
import {
  getSpaceData,
  removeSpace,
} from '../../integration/space/space.request.params';
import { removeOpportunity } from '../../integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '../../integration/organization/organization.request.params';
import {
  removeCommunityRoleFromUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';
import { TestUser } from '@test/utils';
import {
  readPrivilege,
  sorted__applyToCommunity,
  sorted__create_read_update_delete_grant_addMember_apply_invite,
  sorted__create_read_update_delete_grant_addMember_apply_join_invite,
  sorted__create_read_update_delete_grant_addMember_invite,
  sorted__create_read_update_delete_grant_apply_invite,
  sorted__read_applyToCommunity,
  sorted__read_applyToCommunity_joinCommunity,
} from '@test/non-functional/auth/my-privileges/common';

const organizationName = 'com-org-name' + uniqueId;
const hostNameId = 'com-org-nameid' + uniqueId;
const spaceName = 'com-eco-name' + uniqueId;
const spaceNameId = 'com-eco-nameid' + uniqueId;
const opportunityName = 'com-opp';
const challengeName = 'com-chal';

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    RoleType.LEAD
  );

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.spaceCommunityId,
    RoleType.LEAD
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Verify COMMUNITY_ADD_MEMBER privilege', () => {
  describe('DDT role privilege to assign member to space', () => {
    // Arrange
    test.each`
      user                               | myPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_addMember_apply_invite}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_addMember_apply_invite}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__applyToCommunity}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_apply_invite}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__read_applyToCommunity}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_applyToCommunity}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_applyToCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for space journey',
      async ({ user, myPrivileges }) => {
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result =
          request.body.data.space.community.authorization.myPrivileges;

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to challenge', () => {
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_apply_join_invite}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_apply_join_invite}
      ${TestUser.HUB_MEMBER}         | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_apply_join_invite}
      ${TestUser.CHALLENGE_MEMBER}   | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.OPPORTUNITY_MEMBER} | ${sorted__read_applyToCommunity_joinCommunity}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for challenge journey',
      async ({ user, myPrivileges }) => {
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result =
          request.body.data.space.challenges[0].community.authorization
            .myPrivileges;

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });

  describe('DDT role privilege to assign member to opportunity', () => {
    // Arrange
    test.each`
      user                           | myPrivileges
      ${TestUser.GLOBAL_ADMIN}       | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.GLOBAL_HUBS_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.HUB_ADMIN}          | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.HUB_MEMBER}         | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}    | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.CHALLENGE_MEMBER}   | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}  | ${sorted__create_read_update_delete_grant_addMember_invite}
      ${TestUser.OPPORTUNITY_MEMBER} | ${readPrivilege}
    `(
      'User: "$user", should have privileges: "$myPrivileges" for opportunity journey',
      async ({ user, myPrivileges }) => {
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result =
          request.body.data.space.opportunities[0].community.authorization
            .myPrivileges;

        // Assert
        expect(result.sort()).toEqual(myPrivileges);
      }
    );
  });
});
