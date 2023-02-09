import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  getHubData,
  removeHub,
} from '@test/functional-api/integration/hub/hub.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createOrgAndHubWithUsers,
  createChallengeWithUsers,
  createOpportunityWithUsers,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import {
  readPrivilege,
  sorted_sorted__create_read_update_delete_grant_contribute,
  sorted_sorted__create_read_update_delete_grant_contribute_calloutPublished,
  sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted_sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity,
  sorted__create_read_update_delete,
  sorted__create_read_update_delete_authorizationReset,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity,
  sorted__create_read_update_delete_grant_createOpportunity,
  sorted__create_read_update_delete_grant_updateInnovationFlow,
  sorted__read_applyToCommunity_joinCommunity,
  sorted__read_contribute,
  sorted__read_createRelation,
  sorted__read_createRelation_contribute,
} from '../../common';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const hubName = 'Public-hub' + uniqueId;
const hubNameId = 'public-hub' + uniqueId;
const challengeName = `private-chal${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);

  await createOpportunityWithUsers(opportunityName);

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'true'
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Private Challenge of Public hub', () => {
  describe('DDT role access to private challenge', () => {
    // Arrange
    test.each`
      user                               | challengeMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted_sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted_sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted_sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${readPrivilege}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have privileges: "$challengeMyPrivileges" for private challenge of public hub',
      async ({ user, challengeMyPrivileges }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0];

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
      user                               | collaborationMyPrivileges                                                                 | calloutsMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted_sorted__create_read_update_delete_grant_contribute_calloutPublished}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted_sorted__create_read_update_delete_grant_contribute_calloutPublished}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__read_createRelation}                                                            | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted_sorted__create_read_update_delete_grant_contribute_calloutPublished}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_createRelation_contribute}                                                 | ${sorted__read_contribute}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted_sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted_sorted__create_read_update_delete_grant_contribute}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_createRelation_contribute}                                                 | ${sorted__read_contribute}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_createRelation_contribute}                                                 | ${sorted__read_contribute}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_createRelation_contribute}                                                 | ${sorted__read_contribute}
    `(
      'User: "$user", should have Collaboration privileges: "$collaborationMyPrivileges" and Callout privileges: "$calloutsMyPrivileges" for private challenge of public hub',
      async ({ user, collaborationMyPrivileges, calloutsMyPrivileges }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0];

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
      user                               | communityMyPrivileges                                                     | communicationMyPrivileges                                                    | memberUsersMyPrivileges
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity} | ${sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege} | ${sorted__create_read_update_delete_authorizationReset}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant}                                | ${sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege} | ${sorted__create_read_update_delete_authorizationReset}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${sorted__create_read_update_delete_grant}                                | ${sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege} | ${sorted__create_read_update_delete}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity} | ${sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege} | ${sorted__create_read_update_delete_authorizationReset}
      ${TestUser.HUB_MEMBER}             | ${sorted__read_applyToCommunity_joinCommunity}                            | ${readPrivilege}                                                             | ${[]}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity} | ${sorted_sorted__create_read_update_delete_grant_createDiscussion_Privilege} | ${readPrivilege}
      ${TestUser.CHALLENGE_MEMBER}       | ${sorted__read_applyToCommunity_joinCommunity}                            | ${readPrivilege}                                                             | ${[]}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__read_applyToCommunity_joinCommunity}                            | ${readPrivilege}                                                             | ${[]}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${sorted__read_applyToCommunity_joinCommunity}                            | ${readPrivilege}                                                             | ${sorted__create_read_update_delete}
    `(
      'User: "$user", should have Community privileges: "$communityMyPrivileges" and Communication privileges: "$communicationMyPrivileges" and Members privileges "$memberUsersMyPrivileges" for private challenge of public hub',
      async ({
        user,
        communityMyPrivileges,
        communicationMyPrivileges,
        memberUsersMyPrivileges,
      }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0];

        // Assert
        expect(result.community.authorization.myPrivileges.sort()).toEqual(
          communityMyPrivileges
        );

        expect(
          result.community.communication.authorization.myPrivileges.sort()
        ).toEqual(communicationMyPrivileges);

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
      'User: "$user", should have Context privileges: "$contextMyPrivileges" for private challenge of public hub',
      async ({ user, contextMyPrivileges }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0];

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
      'User: "$user", should have Preference privileges: "$preferencesMyPrivileges" for private challenge of public hub',
      async ({ user, preferencesMyPrivileges }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0].preferences;

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
      ${TestUser.GLOBAL_ADMIN}           | ${sorted__create_read_update_delete_grant_updateInnovationFlow}
      ${TestUser.GLOBAL_HUBS_ADMIN}      | ${sorted__create_read_update_delete_grant_updateInnovationFlow}
      ${TestUser.GLOBAL_COMMUNITY_ADMIN} | ${readPrivilege}
      ${TestUser.HUB_ADMIN}              | ${sorted__create_read_update_delete_grant_updateInnovationFlow}
      ${TestUser.HUB_MEMBER}             | ${readPrivilege}
      ${TestUser.CHALLENGE_ADMIN}        | ${sorted__create_read_update_delete_grant}
      ${TestUser.CHALLENGE_MEMBER}       | ${readPrivilege}
      ${TestUser.OPPORTUNITY_ADMIN}      | ${sorted__create_read_update_delete_grant}
      ${TestUser.OPPORTUNITY_MEMBER}     | ${readPrivilege}
    `(
      'User: "$user", should have Opportunities privileges: "$opportunitiesMyPrivileges" for private challenge of public hub',
      async ({ user, opportunitiesMyPrivileges }) => {
        const request = await getHubData(entitiesId.hubId, user);
        const result = request.body.data.hub.challenges[0];

        // Assert

        expect(
          result.opportunities[0].authorization.myPrivileges.sort()
        ).toEqual(opportunitiesMyPrivileges);
      }
    );
  });

  test('Non hub member access to private challenge of public hub', async () => {
    // Arrange
    const request = await getHubData(entitiesId.hubId, TestUser.NON_HUB_MEMBER);
    const result = request.body.data.hub.challenges;

    // Assert
    expect(result).toEqual(null);
  });
});

// ToDo: extended the following areas:
// community.applications
