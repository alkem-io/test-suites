import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  getSpaceDataCodegen,
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import {
  readPrivilege,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted__create_read_update_delete,
  sorted__create_read_update_delete_authorizationReset,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createOpportunity,
  sorted__read_applyToCommunity_joinCommunity,
  sorted__read_createRelation,
  sorted__read_createRelation_contribute,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
  sorted__create_read_update_delete_grant_addMember_Invite,
  sorted__read_createPost_contribute,
  sorted__create_read_update_delete_grant_createPost_contribute,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
  sorted__create_read_update_delete_grant_createDiscussion_communityAddMember_Privilege,
  sorted__create_read_update_delete_grant_createSubspace,
} from '../../common';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  assignUserAsGlobalAdmin,
  removeUserAsGlobalAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { SpacePreferenceType } from '@alkemio/client-lib';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import {
  CommunityMembershipPolicy,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import { getSubspaceDataCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const spaceName = 'Public-space' + uniqueId;
const spaceNameId = 'public-space' + uniqueId;
const challengeName = `private-chal${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);

  await createOpportunityWithUsersCodegen(opportunityName);

  // await changePreferenceSpaceCodegen(
  //   entitiesId.spaceId,
  //   SpacePreferenceType.AuthorizationAnonymousReadAccess,
  //   'false'
  // );
  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: { mode: SpacePrivacyMode.Private },
    membership: { policy: CommunityMembershipPolicy.Applications },
    collaboration: {
      allowMembersToCreateSubspaces: false,
      allowMembersToCreateCallouts: false,
    },
  });

  await updateSpaceSettingsCodegen(entitiesId.challengeId, {
    privacy: { mode: SpacePrivacyMode.Private },
    membership: { policy: CommunityMembershipPolicy.Applications },
    collaboration: {
      allowMembersToCreateSubspaces: false,
      allowMembersToCreateCallouts: false,
      inheritMembershipRights: true,
    },
  });

  await updateSpaceSettingsCodegen(entitiesId.opportunityId, {
    privacy: { mode: SpacePrivacyMode.Private },
    membership: { policy: CommunityMembershipPolicy.Open },
    collaboration: {
      allowMembersToCreateSubspaces: false,
      allowMembersToCreateCallouts: false,
      inheritMembershipRights: true,
    },
  });

  //  await assignUserAsGlobalAdmin(users.qaUserId);
});

afterAll(async () => {
  // await removeUserAsGlobalAdmin(users.qaUserId);
  // await deleteSpaceCodegen(entitiesId.opportunityId);
  // await deleteSpaceCodegen(entitiesId.challengeId);
  // await deleteSpaceCodegen(entitiesId.spaceId);
  // await deleteOrganizationCodegen(entitiesId.organizationId);
});
// ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createSubspace}
// ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createSubspace}
// ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
// ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createSubspace}
// ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createSubspace}
// ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
// ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
// ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
describe('Private Challenge of Private space', () => {
  describe.only('DDT role access to private challenge', () => {
    // Arrange
    test.each`
      user                         | challengeMyPrivileges
      ${TestUser.CHALLENGE_MEMBER} | ${readPrivilege}
    `(
      'User: "$user", should have privileges: "$challengeMyPrivileges" for private challenge of private space',
      async ({ user, challengeMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;
        console.log('result', request);
        console.log('result', request.error);

        console.log('result', request.error?.errors);
        console.log('result', request.error?.errors[0].message);
        console.log('result', request.error?.errors[0].code);

        console.log('result', result);

        // Assert
        expect(result?.authorization?.myPrivileges?.sort()).toEqual(
          challengeMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to collaboration of private challenge', () => {
    // Arrange
    test.each`
      user                               | collaborationMyPrivileges                                                          | calloutsMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__read_createRelation}                                                     | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createPost_contribute}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_createPost_contribute}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createPost_contribute}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_createPost_contribute}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_createPost_contribute}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_createPost_contribute}
    `(
      'User: "$user", should have Collaboration privileges: "$collaborationMyPrivileges" and Callout privileges: "$calloutsMyPrivileges" for private challenge of private space',
      async ({ user, collaborationMyPrivileges, calloutsMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert
        expect(
          result?.collaboration?.authorization?.myPrivileges?.sort()
        ).toEqual(collaborationMyPrivileges);
        expect(
          result?.collaboration?.callouts?.[0].authorization?.myPrivileges?.sort()
        ).toEqual(calloutsMyPrivileges);
      }
    );
  });

  describe('DDT role access to Community of private challenge', () => {
    // Arrange
    test.each`
      user                               | communityMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_addMember_Invite}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_addMember_Invite}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__create_read_update_delete_grant_addMember_Invite}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_applyToCommunity_joinCommunity}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_applyToCommunity_joinCommunity}
    `(
      'User: "$user", should have Community privileges: "$communityMyPrivileges" for private challenge of public space',
      async ({ user, communityMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert
        expect(result?.community?.authorization?.myPrivileges?.sort()).toEqual(
          communityMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to Community / Communication of private challenge', () => {
    // Arrange
    test.each`
      user                               | communicationMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createDiscussion_communityAddMember_Privilege}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createDiscussion_communityAddMember_Privilege}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__create_read_update_delete_grant_createDiscussion_communityAddMember_Privilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Community privileges: Communication privileges: "$communicationMyPrivileges" for private challenge of public space',
      async ({ user, communicationMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert

        expect(
          result?.community?.communication?.authorization?.myPrivileges?.sort()
        ).toEqual(communicationMyPrivileges);
      }
    );
  });

  // Until updated to get data for selfuser per user
  describe.skip('DDT role access to Community / memberUsers of private challenge', () => {
    // Arrange
    test.each`
      user                               | memberUsersMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_authorizationReset}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_authorizationReset}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__create_read_update_delete}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete}
      ${TestUser.HUB_MEMBER}             | ${[]}
      ${TestUser.CHALLENGE_ADMIN}        | ${[]}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${[]}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__create_read_update_delete}
    `(
      'User: "$user", should have Community privileges:  Members privileges "$memberUsersMyPrivileges" for private challenge of public space',
      async ({
        user,

        memberUsersMyPrivileges,
      }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert

        expect(
          result?.community?.memberUsers?.[0].authorization?.myPrivileges?.sort()
        ).toEqual(memberUsersMyPrivileges);
      }
    );
  });

  describe('DDT role access to context of private challenge', () => {
    // ToDo: add recommendations and preferences tests

    // Arrange
    test.each`
      user                               | contextMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Context privileges: "$contextMyPrivileges" for private challenge of private space',
      async ({ user, contextMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert
        expect(result?.context?.authorization?.myPrivileges?.sort()).toEqual(
          contextMyPrivileges
        );
      }
    );
  });

  // describe('DDT role access to preferences of private challenge', () => {
  //   // Arrange
  //   test.each`
  //     user                               | preferencesMyPrivileges
  //     ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant}
  //     ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant}
  //     ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
  //     ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant}
  //     ${TestUser.HUB_MEMBER}             | ${readPrivilege}
  //     ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant}
  //     ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
  //     ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
  //     ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
  //   `(
  //     'User: "$user", should have Preference privileges: "$preferencesMyPrivileges" for private challenge of private space',
  //     async ({ user, preferencesMyPrivileges }) => {
  //       const request = await getSubspaceDataCodegen(
  //         entitiesId.spaceId,
  //         entitiesId.challengeId,
  //         user
  //       );
  //       const result = request.data?.space.subspace.settings ?? [];

  //       // Assert
  //       for (const settings of result) {
  //         expect(settings.authorization?.myPrivileges?.sort()).toEqual(
  //           preferencesMyPrivileges
  //         );
  //       }
  //     }
  //   );
  // });

  describe('DDT role access to opportunities of private challenge', () => {
    // Arrange
    test.each`
      user                               | opportunitiesMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createSubspace}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createSubspace}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createSubspace}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createSubspace}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__create_read_update_delete_grant_createSubspace}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Opportunities privileges: "$opportunitiesMyPrivileges" for private challenge of private space',
      async ({ user, opportunitiesMyPrivileges }) => {
        const request = await getSubspaceDataCodegen(
          entitiesId.spaceId,
          entitiesId.challengeId,
          user
        );
        const result = request.data?.space.subspace;

        // Assert

        expect(
          result?.subspaces?.[0].authorization?.myPrivileges?.sort()
        ).toEqual(opportunitiesMyPrivileges);
      }
    );
  });

  // test('Non space member access to private challenge of public space', async () => {
  //   // Arrange
  //   const request = await getSpaceDataCodegen(
  //     entitiesId.spaceId,
  //     TestUser.NON_HUB_MEMBER
  //   );
  //   const result = request.data?.space.challenges;

  //   // Assert
  //   expect(result).toEqual(undefined);
  //   // expect(request?.error?.errors[0].message).toEqual(null);
  // });
});

// ToDo: extended the following areas:
// community.applications
