/* eslint-disable prettier/prettier */
import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  challengeVariablesData,
  createChallenge,
  uniqueId,
} from '@test/utils/mutations/create-mutation';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';

import {
  getChallengeData,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../zcommunications/create-entities-with-users-helper';
import { entitiesId, users } from '../zcommunications/communications-helper';
import {
  createOpportunityPredefinedData,
  getOpportunityData,
  removeOpportunity,
} from '../integration/opportunity/opportunity.request.params';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const hubName = 'ch-pref-eco-name' + uniqueId;
const hubNameId = 'ch-pref-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
let challengeId2 = '';
let preferencesConfig: any[] = [];
const sorted__create_read_update_delete_grant = [
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
  'GRANT',
];
const sorted__create_read_update_delete_grant_createRelation_createCallout_contribute = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
  'CONTRIBUTE',
];
const sorted__create_read_update_delete_grant_createRelation_createCallout = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
];
const sorted__create_read_update_delete_grant_communityApply = [
  ...sorted__create_read_update_delete_grant,
  'COMMUNITY_APPLY',
];
const sorted__create_read_update_delete_grant_communityJoin = [
  ...sorted__create_read_update_delete_grant,
  'COMMUNITY_JOIN',
];
const read_createRelation = ['READ', 'CREATE_RELATION'];

const read_createOpportunity = ['READ', 'CREATE_OPPORTUNITY'];
const read = ['READ'];

const read_createRelation_contribute = [
  'READ',
  'CREATE_RELATION',
  'CONTRIBUTE',
];

const sorted__create_read_update_delete_grant_createOpportunity = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_OPPORTUNITY',
];

export const updateAllChallengePreferences = async (
  challengeId: string,
  value: string
) => {
  preferencesConfig = [
    {
      type: ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
    },
    {
      type: ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
    },
    {
      type: ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
    },
    {
      type: ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
    },
    {
      type: ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT,
    },
    {
      type: ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
    },
  ];
  for (const config of preferencesConfig)
    await changePreferenceChallenge(challengeId, config.type, value);
};

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await createChallengeWithUsers(challengeName);

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'true'
  );

  await updateAllChallengePreferences(entitiesId.challengeId, 'false');
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Challenge preferences', () => {
  test('Update challenge preference ALLOW_NON_MEMBERS_READ_ACCESS', async () => {
    // Act
    const res = await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
      'false'
    );

    // Assert
    expect(res.body.data.updatePreferenceOnChallenge.value).toContain('false');
  });

  describe('DDT hub admin not challenge member community privileges', () => {
    afterAll(async () => {
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'true'
      );
    });
    // Arrange
    test.each`
      preferenceType                                                        | value      | expectedCommunityMyPrivileges                             | expectedCollaborationMyPrivileges                                                  | expectedEntityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'true'}  | ${sorted__create_read_update_delete_grant_communityApply} | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'false'} | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'true'}  | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'false'} | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'true'}  | ${sorted__create_read_update_delete_grant_communityJoin}  | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'false'} | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'true'}  | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'false'} | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'true'}  | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'false'} | ${sorted__create_read_update_delete_grant}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
    `(
      'Hub admin, non-challenge member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedCommunityMyPrivileges,
        expectedCollaborationMyPrivileges,
        expectedEntityMyPrivileges,
      }) => {
        const updateChallengePref = await changePreferenceChallenge(
          entitiesId.challengeId,
          preferenceType,
          value
        );

        const nonChallengeQueryMemebrs = await getChallengeData(
          entitiesId.hubId,
          entitiesId.challengeId,
          TestUser.HUB_ADMIN
        );
        const result = nonChallengeQueryMemebrs.body.data.hub.challenge;

        // Assert
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.value
        ).toEqual(value);
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.definition
            .type
        ).toEqual(preferenceType);
        expect(result.community.authorization.myPrivileges.sort()).toEqual(
          expectedCommunityMyPrivileges.sort()
        );
        expect(result.collaboration.authorization.myPrivileges.sort()).toEqual(
          expectedCollaborationMyPrivileges.sort()
        );
        expect(result.authorization.myPrivileges.sort()).toEqual(
          expectedEntityMyPrivileges.sort()
        );
      }
    );
  });

  describe('DDT hub member not challenge member community privileges', () => {
    afterAll(async () => {
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'true'
      );
    });
    // Arrange
    test.each`
      preferenceType                                                        | value      | expectedCommunityMyPrivileges | expectedCollaborationMyPrivileges | expectedEntityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
    `(
      'hub member, not challenge member should have community privileges: "$expectedCommunityMyPrivileges", collaboration privileges: "$expectedCollaborationMyPrivileges" and entity privilege: "$expectedEntityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedCommunityMyPrivileges,
        expectedCollaborationMyPrivileges,
        expectedEntityMyPrivileges,
      }) => {
        const updateChallengePref = await changePreferenceChallenge(
          entitiesId.challengeId,
          preferenceType,
          value
        );
        const update =
          updateChallengePref.body.data.updatePreferenceOnChallenge;

        const nonChallengeQueryMemebrs = await getChallengeData(
          entitiesId.hubId,
          entitiesId.challengeId,
          TestUser.NON_HUB_MEMBER
        );
        const result = nonChallengeQueryMemebrs.body.data.hub.challenge;

        // Assert
        expect(update.value).toEqual(value);

        expect(update.definition.type).toEqual(preferenceType);

        expect(result.community.authorization).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });

        expect(result.collaboration.authorization).toEqual({
          myPrivileges: expectedCollaborationMyPrivileges,
        });

        expect(result.authorization).toEqual({
          anonymousReadAccess: true,
          myPrivileges: expectedEntityMyPrivileges,
        });
      }
    );
  });

  test('challenge with preference: "ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES": true and "ALLOW_HUB_MEMBERS_TO_CONTRIBUTE": true and non challenge member has right privileges', async () => {
    // Act
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      'true'
    );
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
      'true'
    );

    const nonChallengeQueryMemebrs = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.HUB_MEMBER
    );
    const result = nonChallengeQueryMemebrs.body.data.hub.challenge;

    // Assert
    expect(result.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: read,
    });

    expect(result.collaboration.authorization).toEqual({
      myPrivileges: read_createRelation_contribute,
    });

    expect(result.authorization).toEqual({
      anonymousReadAccess: true,
      myPrivileges: read_createOpportunity,
    });

    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
      'false'
    );
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
      'false'
    );
  });

  describe('Hub member privileges on Opportunity level', () => {
    let oppId = '';
    beforeAll(async () => {
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
        'true'
      );
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
        'true'
      );
    });

    afterAll(async () => {
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES,
        'false'
      );
      await changePreferenceChallenge(
        entitiesId.challengeId,
        ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE,
        'false'
      );
    });

    afterEach(async () => {
      await removeOpportunity(oppId);
    });

    test('user member only of a hub, creates opportunity on child challenge and check privileges on opportunity', async () => {
      // Act
      const createOpportunity = await createOpportunityPredefinedData(
        entitiesId.challengeId,
        'oppName',
        TestUser.HUB_MEMBER
      );

      oppId = createOpportunity.body.data.createOpportunity.id;

      const nonChallengeMemebrs = await getOpportunityData(
        entitiesId.hubId,
        oppId,
        TestUser.HUB_MEMBER
      );
      const result = nonChallengeMemebrs.body.data.hub.opportunity;

      // Assert
      expect(result.community.authorization.myPrivileges.sort()).toEqual(
        sorted__create_read_update_delete_grant.sort()
      );

      expect(result.collaboration.authorization.myPrivileges.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute.sort()
      );

      expect(result.authorization.myPrivileges.sort()).toEqual(
        sorted__create_read_update_delete_grant.sort()
      );
    });

    test('user member only of a hub, check privileges on opportunity level', async () => {
      // Act
      const createOpportunity = await createOpportunityPredefinedData(
        entitiesId.challengeId,
        'oppName',
        TestUser.GLOBAL_ADMIN
      );

      oppId = createOpportunity.body.data.createOpportunity.id;

      const nonChallengeMemebrs = await getOpportunityData(
        entitiesId.hubId,
        oppId,
        TestUser.HUB_MEMBER
      );
      const result = nonChallengeMemebrs.body.data.hub.opportunity;

      // Assert
      expect(result.community.authorization.myPrivileges).toEqual(read);

      expect(result.collaboration.authorization.myPrivileges.sort()).toEqual(
        read_createRelation_contribute.sort()
      );

      expect(result.authorization.myPrivileges).toEqual(read);
    });
  });

  describe('DDT user privileges to update challenge preferences', () => {
    // Arrange
    test.each`
      userRole                     | message
      ${TestUser.GLOBAL_ADMIN}     | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.HUB_ADMIN}        | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.HUB_MEMBER}       | ${'errors'}
      ${TestUser.CHALLENGE_ADMIN}  | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.CHALLENGE_MEMBER} | ${'errors'}
      ${TestUser.NON_HUB_MEMBER}   | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", who intend to update challenge preference ',
      async ({ userRole, message }) => {
        // Act
        const updateOrganizationPref = await changePreferenceChallenge(
          entitiesId.challengeId,
          ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
          'false',
          userRole
        );

        // Assert
        expect(updateOrganizationPref.text).toContain(message);
      }
    );
  });

  test('non challenge member joins challenge community', async () => {
    // Arrange
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.challengeCommunityId, TestUser.HUB_MEMBER);

    const query = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.HUB_MEMBER
    );
    const userJoins = query.body.data.hub.challenge.community;

    // Assert
    expect(userJoins.memberUsers).toHaveLength(6);
    expect(userJoins.leadUsers).toHaveLength(0);
    expect(query.body.data.hub.challenge.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.hubMemberId
      )
    );
  });

  test('throw error for joining the same challenge community twice', async () => {
    // Arrange
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.challengeCommunityId, TestUser.HUB_MEMBER);

    const userJoinSecondTime = await joinCommunity(
      entitiesId.challengeCommunityId,
      TestUser.HUB_MEMBER
    );

    expect(userJoinSecondTime.text).toContain(
      `Agent (${users.hubMemberEmail}) already has assigned credential: challenge-member`
    );

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
  });

  describe('User with rights to join / apply one Challenge, cannot perform to another Challenge ', () => {
    test('Challenge 1 has all preference true, challenge 2: false (except \'ALLOW_NON_MEMBERS_READ_ACCESS\')', async () => {
      // Arrange

      const responseChallenge = await mutation(
        createChallenge,
        challengeVariablesData(
          challengeName + '2',
          `chnameid2${uniqueId}`,
          entitiesId.hubId
        )
      );
      challengeId2 = responseChallenge.body.data.createChallenge.id;

      await updateAllChallengePreferences(entitiesId.challengeId, 'true');
      await updateAllChallengePreferences(challengeId2, 'false');
      await changePreferenceChallenge(
        challengeId2,
        ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
        'true'
      );

      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        challengeId2,
        TestUser.HUB_MEMBER
      );

      // Assert
      expect(response.body.data.hub.challenge.community.authorization).toEqual({
        anonymousReadAccess: false,
        myPrivileges: ['READ'],
      });

      await removeChallenge(challengeId2);
    });
  });
});
