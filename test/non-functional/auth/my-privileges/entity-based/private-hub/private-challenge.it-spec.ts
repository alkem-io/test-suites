import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  getSpaceData,
  removeSpace,
} from '@test/functional-api/integration/space/space.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndSpaceWithUsers,
  createChallengeWithUsers,
  createOpportunityWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  readPrivilege,
  sorted__create_read_update_delete_grant_contribute,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity,
  sorted__create_read_update_delete,
  sorted__create_read_update_delete_authorizationReset,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createOpportunity,
  sorted__create_read_update_delete_grant_updateInnovationFlow,
  sorted__read_applyToCommunity_joinCommunity,
  sorted__read_contribute,
  sorted__read_createRelation,
  sorted__read_createRelation_contribute,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
  sorted__create_read_update_delete_grant_addMember_Invite,
  sorted__create_read_update_delete_grant_contribute_calloutPublished,
} from '../../common';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import {
  assignUserAsGlobalAdmin,
  removeUserAsGlobalAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const spaceName = 'Public-space' + uniqueId;
const spaceNameId = 'public-space' + uniqueId;
const challengeName = `private-chal${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsers(challengeName);

  await createOpportunityWithUsers(opportunityName);

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await assignUserAsGlobalAdmin(users.qaUserId);
});

afterAll(async () => {
  await removeUserAsGlobalAdmin(users.qaUserId);

  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Private Challenge of Private space', () => {
  describe('DDT role access to private challenge', () => {
    // Arrange
    test.each`
      user                               | challengeMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert
        expect(result.authorization.myPrivileges.sort()).toEqual(
          challengeMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to collaboration of private challenge', () => {
    // Arrange
    test.each`
      user                               | collaborationMyPrivileges                                                          | calloutsMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_contribute_calloutPublished}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_contribute_calloutPublished}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__read_createRelation}                                                     | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_contribute}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_contribute}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_contribute}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_contribute}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_createRelation_contribute}                                          | ${sorted__read_contribute}
    `(
      'User: "$user", should have Collaboration privileges: "$collaborationMyPrivileges" and Callout privileges: "$calloutsMyPrivileges" for private challenge of private space',
      async ({ user, collaborationMyPrivileges, calloutsMyPrivileges }) => {
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert
        expect(result.collaboration.authorization.myPrivileges.sort()).toEqual(
          collaborationMyPrivileges
        );
        expect(
          result.collaboration.callouts[0].authorization.myPrivileges.sort()
        ).toEqual(calloutsMyPrivileges);
      }
    );
  });

  describe('DDT role access to Community of private challenge', () => {
    // Arrange
    test.each`
      user                               | communityMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant_addMember_Invite}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert
        expect(result.community.authorization.myPrivileges.sort()).toEqual(
          communityMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to Community / Communication of private challenge', () => {
    // Arrange
    test.each`
      user                               | communicationMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createDiscussion_Privilege}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Community privileges: Communication privileges: "$communicationMyPrivileges" for private challenge of public space',
      async ({ user, communicationMyPrivileges }) => {
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert

        expect(
          result.community.communication.authorization.myPrivileges.sort()
        ).toEqual(communicationMyPrivileges);
      }
    );
  });

  // Until updated to get data for selfuser per user
  describe.skip('DDT role access to Community / memberUsers of private challenge', () => {
    // Arrange
    test.each`
      user                               | memberUsersMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_authorizationReset}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert

        expect(
          result.community.memberUsers[0].authorization.myPrivileges.sort()
        ).toEqual(memberUsersMyPrivileges);
      }
    );
  });

  describe('DDT role access to context of private challenge', () => {
    // ToDo: add recommendations and preferences tests

    // Arrange
    test.each`
      user                               | contextMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert
        expect(result.context.authorization.myPrivileges.sort()).toEqual(
          contextMyPrivileges
        );
      }
    );
  });

  describe('DDT role access to preferences of private challenge', () => {
    // Arrange
    test.each`
      user                               | preferencesMyPrivileges
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0].preferences;

        // Assert
        for (const preference of result) {
          expect(preference.authorization.myPrivileges.sort()).toEqual(
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
      ${TestUser.QA_USER}                | ${sorted__create_read_update_delete_grant_updateInnovationFlow}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_updateInnovationFlow}
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
        const request = await getSpaceData(entitiesId.spaceId, user);
        const result = request.body.data.space.challenges[0];

        // Assert

        expect(
          result.opportunities[0].authorization.myPrivileges.sort()
        ).toEqual(opportunitiesMyPrivileges);
      }
    );
  });

  test('Non space member access to private challenge of public space', async () => {
    // Arrange
    const request = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    const result = request.body.data.space.challenges;

    // Assert
    expect(result).toEqual(null);
  });
});

// ToDo: extended the following areas:
// community.applications
