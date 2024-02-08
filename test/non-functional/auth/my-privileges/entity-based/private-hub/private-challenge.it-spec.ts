import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  getSpaceDataCodegen,
  deleteSpaceCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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
} from '../../common';
import { deleteChallengeCodegen } from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteOpportunityCodegen } from '@test/functional-api/journey/opportunity/opportunity.request.params';
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

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );

  //  await assignUserAsGlobalAdmin(users.qaUserId);
});

afterAll(async () => {
  await removeUserAsGlobalAdmin(users.qaUserId);

  await deleteOpportunityCodegen(entitiesId.opportunityId);
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Private Challenge of Private space', () => {
  describe('DDT role access to private challenge', () => {
    // Arrange
    test.each`
      user                               | challengeMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have privileges: "$challengeMyPrivileges" for private challenge of private space',
      async ({ user, challengeMyPrivileges }) => {
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

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
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

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
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

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
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

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
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

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
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

        // Assert
        expect(result?.context?.authorization?.myPrivileges?.sort()).toEqual(
          contextMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to preferences of private challenge', () => {
    // Arrange
    test.each`
      user                               | preferencesMyPrivileges
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
      'User: "$user", should have Preference privileges: "$preferencesMyPrivileges" for private challenge of private space',
      async ({ user, preferencesMyPrivileges }) => {
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0].preferences ?? [];

        // Assert
        for (const preference of result) {
          expect(preference.authorization?.myPrivileges?.sort()).toEqual(
            preferencesMyPrivileges
          );
        }
      }
    );
  });

  describe('DDT role access to opportunities of private challenge', () => {
    // Arrange
    test.each`
      user                               | opportunitiesMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Opportunities privileges: "$opportunitiesMyPrivileges" for private challenge of private space',
      async ({ user, opportunitiesMyPrivileges }) => {
        const request = await getSpaceDataCodegen(entitiesId.spaceId, user);
        const result = request.data?.space.challenges?.[0];

        // Assert

        expect(
          result?.opportunities?.[0].authorization?.myPrivileges?.sort()
        ).toEqual(opportunitiesMyPrivileges);
      }
    );
  });

  test('Non space member access to private challenge of public space', async () => {
    // Arrange
    const request = await getSpaceDataCodegen(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    const result = request.data?.space.challenges;

    // Assert
    expect(result).toEqual(undefined);
    // expect(request?.error?.errors[0].message).toEqual(null);
  });
});

// ToDo: extended the following areas:
// community.applications
