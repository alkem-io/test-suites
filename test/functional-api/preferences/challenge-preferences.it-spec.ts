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
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const hubName = 'ch-pref-eco-name' + uniqueId;
const hubNameId = 'ch-pref-eco-nameid' + uniqueId;
const challengeName = `chName${uniqueId}`;
let challengeId2 = '';
let preferencesConfig: any[] = [];
const create_read_update_delete_grant = [
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
  'GRANT',
];
const create_read_update_delete_grant_communityApply = [
  ...create_read_update_delete_grant,
  'COMMUNITY_APPLY',
];
const create_read_update_delete_grant_communityJoin = [
  ...create_read_update_delete_grant,
  'COMMUNITY_JOIN',
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

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.nonHubMemberId
    )
  );

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
  describe('DDT hub admin not challenge member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                                        | value      | expectedPrefenceValue                                                 | expectedCommunityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'true'}  | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${create_read_update_delete_grant_communityApply}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'false'} | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'true'}  | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'false'} | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'true'}  | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${create_read_update_delete_grant_communityJoin}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'false'} | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'true'}  | ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'false'} | ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'true'}  | ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'false'} | ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${'true'}  | ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${create_read_update_delete_grant}
      ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${'false'} | ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${create_read_update_delete_grant}
    `(
      'Hub admin, non-challenge member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
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

        // Assert
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.value
        ).toEqual(value);
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.definition
            .type
        ).toEqual(expectedPrefenceValue);
        expect(
          nonChallengeQueryMemebrs.body.data.hub.challenge.community
            .authorization
        ).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });
      }
    );
  });

  describe.only('DDT hub member not challenge member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                                        | value      | expectedPrefenceValue                                                 | expectedCommunityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'true'}  | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${['READ', 'COMMUNITY_APPLY']}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${'false'} | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS}           | ${['READ']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'true'}  | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${['READ']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${'false'} | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}              | ${['READ']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'true'}  | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${['READ', 'COMMUNITY_JOIN']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${'false'} | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}            | ${['READ']}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'true'}  | ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${['READ']}
      ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${'false'} | ${ChallengePreferenceType.ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES} | ${['READ']}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'true'}  | ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${['READ']}
      ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${'false'} | ${ChallengePreferenceType.ALLOW_HUB_MEMBERS_TO_CONTRIBUTE}            | ${['READ']}
      ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${'true'}  | ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${['READ']}
      ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${'false'} | ${ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS}              | ${['READ']}
    `(
      'hub member, not challenge member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        const updateChallengePref = await changePreferenceChallenge(
          entitiesId.challengeId,
          preferenceType,
          value
        );
        console.log(updateChallengePref.body);

        const nonChallengeQueryMemebrs = await getChallengeData(
          entitiesId.hubId,
          entitiesId.challengeId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.value
        ).toEqual(value);
        expect(
          updateChallengePref.body.data.updatePreferenceOnChallenge.definition
            .type
        ).toEqual(expectedPrefenceValue);
        expect(
          nonChallengeQueryMemebrs.body.data.hub.challenge.community
            .authorization
        ).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });
      }
    );
  });

  describe('DDT user privileges to update challenge preferences', () => {
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"updatePreferenceOnChallenge"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
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
    await joinCommunity(entitiesId.hubCommunityId);

    const query = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );
    const userJoins = query.body.data.hub.challenge.community;

    // Assert
    expect(userJoins.memberUsers).toHaveLength(3);
    expect(userJoins.leadUsers).toHaveLength(0);
    expect(query.body.data.hub.challenge.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.challengeCommunityId,
        users.nonHubMemberId
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
    await joinCommunity(entitiesId.challengeCommunityId);

    const userJoinSecondTime = await joinCommunity(
      entitiesId.challengeCommunityId
    );

    expect(userJoinSecondTime.text).toContain(
      `Agent (${users.nonHubMemberEmail}) already has assigned credential: challenge-member`
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
    test('Challenge 1 has all preference true, challenge 2: false', async () => {
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

      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        challengeId2,
        TestUser.NON_HUB_MEMBER
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
