import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserToCommunity,
  assignUserToCommunityVariablesData,
} from '@test/utils/mutations/assign-mutation';
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
  removeUserFromCommunity,
  removeUserFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../create-entities-with-users-helper';
import { entitiesId, users } from '../communications-helper';
import {
  getChallengeData,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';

let organizationName = 'ch-pref-org-name' + uniqueId;
let hostNameId = 'ch-pref-org-nameid' + uniqueId;
let hubName = 'ch-pref-eco-name' + uniqueId;
let hubNameId = 'ch-pref-eco-nameid' + uniqueId;
let challengeName = `chName${uniqueId}`;
let challengeId2 = '';
let preferencesConfig: any[] = [];

export const updateAllChallengePreferences = async (
  challengeId: string,
  value: string
) => {
  preferencesConfig = [
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
    assignUserToCommunity,
    assignUserToCommunityVariablesData(
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
      preferenceType                                              | value      | expectedPrefenceValue                                       | expectedCommunityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${'true'}  | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT', 'COMMUNITY_APPLY']}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${'false'} | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${'true'}  | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${'false'} | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${'true'}  | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT', 'COMMUNITY_JOIN']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${'false'} | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${['CREATE', 'READ', 'UPDATE', 'DELETE', 'GRANT']}
    `(
      'Hub admin, non-hub member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        let updateChallengePref = await changePreferenceChallenge(
          entitiesId.challengeId,
          preferenceType,
          value
        );

        let nonChallengeQueryMemebrs = await getChallengeData(
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

  describe('DDT hub member not challenge member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                              | value      | expectedPrefenceValue                                       | expectedCommunityMyPrivileges
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${'true'}  | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${['READ', 'COMMUNITY_APPLY']}
      ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${'false'} | ${ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS} | ${['READ']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${'true'}  | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${['READ']}
      ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${'false'} | ${ChallengePreferenceType.FEEDBACK_ON_CHALLENGE_CONTEXT}    | ${['READ']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${'true'}  | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${['READ', 'COMMUNITY_JOIN']}
      ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${'false'} | ${ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS}  | ${['READ']}
    `(
      'hub member, not challenge member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        let updateChallengePref = await changePreferenceChallenge(
          entitiesId.challengeId,
          preferenceType,
          value
        );

        let nonChallengeQueryMemebrs = await getChallengeData(
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
        let updateOrganizationPref = await changePreferenceChallenge(
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

    let query = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.NON_HUB_MEMBER
    );
    let userJoins = query.body.data.hub.challenge.community.members;

    // Assert
    expect(userJoins).toHaveLength(3);
    expect(query.body.data.hub.challenge.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await mutation(
      removeUserFromCommunity,
      removeUserFromCommunityVariablesData(
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

    let userJoinSecondTime = await joinCommunity(
      entitiesId.challengeCommunityId
    );

    expect(userJoinSecondTime.text).toContain(
      `Agent (${users.nonHubMemberEmail}) already has assigned credential: challenge-member`
    );

    await mutation(
      removeUserFromCommunity,
      removeUserFromCommunityVariablesData(
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
      let response = await getChallengeData(
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
