/* eslint-disable prettier/prettier */
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceChallenge,
  changePreferenceChallengeCodegen,
  changePreferenceSpaceCodegen,
} from '@test/utils/mutations/preferences-mutation';

import {
  getChallengeData,
  getChallengeDataCodegen,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '../zcommunications/communications-helper';
import {
  createOpportunityCodegen,
  getOpportunityDataCodegen,
  deleteOpportunityCodegen,
} from '../integration/opportunity/opportunity.request.params';
import { users } from '@test/utils/queries/users-data';
import { sorted__create_read_update_delete_grant_createRelation_createCallout_contribute } from '@test/non-functional/auth/my-privileges/common';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import {
  ChallengePreferenceType,
  CommunityRole,
  SpacePreferenceType,
} from '@alkemio/client-lib';
import {
  getUserCommunityPrivilegeToOpportunityCodegen,
  removeCommunityRoleFromUserCodegen,
} from '../integration/community/community.request.params';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';

const organizationName = 'ch-pref-org-name' + uniqueId;
const hostNameId = 'ch-pref-org-nameid' + uniqueId;
const spaceName = 'ch-pref-eco-name' + uniqueId;
const spaceNameId = 'ch-pref-eco-nameid' + uniqueId;
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

const sorted__create_read_update_delete_grant_createRelation_createCallout = [
  ...sorted__create_read_update_delete_grant,
  'CREATE_RELATION',
  'CREATE_CALLOUT',
];

const sorted__create_read_update_delete_grant_communityApply_addMember_Invite = [
  ...sorted__create_read_update_delete_grant,
  'COMMUNITY_APPLY',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_INVITE',
];
const sorted__create_read_update_delete_grant_addMember_Invite = [
  ...sorted__create_read_update_delete_grant,
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_INVITE',
];

const sorted__create_read_update_delete_grant_communityJoin_addMember_Invite = [
  ...sorted__create_read_update_delete_grant,
  'COMMUNITY_JOIN',
  'COMMUNITY_ADD_MEMBER',
  'COMMUNITY_INVITE',
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
      type: ChallengePreferenceType.AllowContributorsToCreateOpportunities,
    },
    {
      type: ChallengePreferenceType.AllowSpaceMembersToContribute,
    },
    {
      type: ChallengePreferenceType.AllowNonMembersReadAccess,
    },
    {
      type: ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
    },
    {
      type: ChallengePreferenceType.MembershipFeedbackOnChallengeContext,
    },
    {
      type: ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    },
  ];
  for (const config of preferencesConfig)
    await changePreferenceChallengeCodegen(challengeId, config.type, value);
};

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeWithUsersCodegen(challengeName);

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'true'
  );

  await updateAllChallengePreferences(entitiesId.challengeId, 'false');
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Challenge preferences', () => {
  test('Update challenge preference ALLOW_NON_MEMBERS_READ_ACCESS', async () => {
    // Act
    const res = await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.AllowNonMembersReadAccess,
      'false'
    );

    // Assert
    expect(res?.data?.updatePreferenceOnChallenge.value).toContain('false');
  });

  describe('DDT space admin not challenge member community privileges', () => {
    afterAll(async () => {
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowNonMembersReadAccess,
        'true'
      );
    });
    // Arrange
    test.each`
      preferenceType                                                      | value      | expectedCommunityMyPrivileges                                              | expectedCollaborationMyPrivileges                                                  | expectedEntityMyPrivileges
      ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers} | ${'true'}  | ${sorted__create_read_update_delete_grant_communityApply_addMember_Invite} | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers} | ${'false'} | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.MembershipFeedbackOnChallengeContext}     | ${'true'}  | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.MembershipFeedbackOnChallengeContext}     | ${'false'} | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers}  | ${'true'}  | ${sorted__create_read_update_delete_grant_communityJoin_addMember_Invite}  | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers}  | ${'false'} | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.AllowContributorsToCreateOpportunities}   | ${'true'}  | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.AllowContributorsToCreateOpportunities}   | ${'false'} | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.AllowSpaceMembersToContribute}            | ${'true'}  | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout_contribute} | ${sorted__create_read_update_delete_grant_createOpportunity}
      ${ChallengePreferenceType.AllowSpaceMembersToContribute}            | ${'false'} | ${sorted__create_read_update_delete_grant_addMember_Invite}                | ${sorted__create_read_update_delete_grant_createRelation_createCallout}            | ${sorted__create_read_update_delete_grant_createOpportunity}
    `(
      'Space admin, non-challenge member should have privileges: "$expectedCommunityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedCommunityMyPrivileges,
        expectedCollaborationMyPrivileges,
        expectedEntityMyPrivileges,
      }) => {
        const updateChallengePref = await changePreferenceChallengeCodegen(
          entitiesId.challengeId,
          preferenceType,
          value
        );

        const nonChallengeQueryMemebrs = await getChallengeDataCodegen(
          entitiesId.challengeId,
          TestUser.HUB_ADMIN
        );
        const result = nonChallengeQueryMemebrs?.data?.lookup?.challenge;

        // Assert
        expect(
          updateChallengePref?.data?.updatePreferenceOnChallenge.value
        ).toEqual(value);
        expect(
          updateChallengePref?.data?.updatePreferenceOnChallenge?.definition
            .type
        ).toEqual(preferenceType);
        expect(result?.community?.authorization?.myPrivileges?.sort()).toEqual(
          expectedCommunityMyPrivileges.sort()
        );
        expect(
          result?.collaboration?.authorization?.myPrivileges?.sort()
        ).toEqual(expectedCollaborationMyPrivileges.sort());
        expect(result?.authorization?.myPrivileges?.sort()).toEqual(
          expectedEntityMyPrivileges.sort()
        );
      }
    );
  });

  describe('DDT space member not challenge member community privileges', () => {
    afterAll(async () => {
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowNonMembersReadAccess,
        'true'
      );
    });
    // Arrange
    test.each`
      preferenceType                                                      | value      | expectedCommunityMyPrivileges | expectedCollaborationMyPrivileges | expectedEntityMyPrivileges
      ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers} | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers} | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.MembershipFeedbackOnChallengeContext}     | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.MembershipFeedbackOnChallengeContext}     | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers}  | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers}  | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.AllowContributorsToCreateOpportunities}   | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.AllowContributorsToCreateOpportunities}   | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.AllowSpaceMembersToContribute}            | ${'true'}  | ${read}                       | ${read_createRelation}            | ${read}
      ${ChallengePreferenceType.AllowSpaceMembersToContribute}            | ${'false'} | ${read}                       | ${read_createRelation}            | ${read}
    `(
      'space member, not challenge member should have community privileges: "$expectedCommunityMyPrivileges", collaboration privileges: "$expectedCollaborationMyPrivileges" and entity privilege: "$expectedEntityMyPrivileges" for challenge with preference: "$preferenceType": "$value"',
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

        const nonChallengeQueryMemebrs = await getChallengeDataCodegen(
          entitiesId.challengeId,
          TestUser.NON_HUB_MEMBER
        );
        const result = nonChallengeQueryMemebrs?.data?.lookup.challenge;

        // Assert
        expect(update.value).toEqual(value);

        expect(update.definition.type).toEqual(preferenceType);

        expect(result?.community?.authorization).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });

        expect(result?.collaboration?.authorization).toEqual({
          myPrivileges: expectedCollaborationMyPrivileges,
        });

        expect(result?.authorization).toEqual({
          anonymousReadAccess: true,
          myPrivileges: expectedEntityMyPrivileges,
        });
      }
    );
  });

  test('challenge with preference: "ALLOW_CONTRIBUTORS_TO_CREATE_OPPORTUNITIES": true and "ALLOW_HUB_MEMBERS_TO_CONTRIBUTE": true and non challenge member has right privileges', async () => {
    // Act
    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.AllowContributorsToCreateOpportunities,
      'true'
    );
    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.AllowSpaceMembersToContribute,
      'true'
    );

    const nonChallengeQueryMemebrs = await getChallengeData(
      entitiesId.spaceId,
      entitiesId.challengeId,
      TestUser.HUB_MEMBER
    );
    const result = nonChallengeQueryMemebrs.body.data.space.challenge;

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

    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.AllowContributorsToCreateOpportunities,
      'false'
    );
    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.AllowSpaceMembersToContribute,
      'false'
    );
  });

  describe('Space member privileges on Opportunity level', () => {
    let oppId = '';
    beforeAll(async () => {
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowContributorsToCreateOpportunities,
        'true'
      );
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowSpaceMembersToContribute,
        'true'
      );

      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowNonMembersReadAccess,
        'true'
      );
    });

    afterAll(async () => {
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowContributorsToCreateOpportunities,
        'false'
      );
      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowSpaceMembersToContribute,
        'false'
      );

      await changePreferenceChallengeCodegen(
        entitiesId.challengeId,
        ChallengePreferenceType.AllowNonMembersReadAccess,
        'false'
      );
    });

    afterEach(async () => {
      await deleteOpportunityCodegen(oppId);
    });

    test('user member only of a space, creates opportunity on child challenge and check privileges on opportunity', async () => {
      // Act
      const createOpportunity = await createOpportunityCodegen(
        'oppName' + uniqueId,
        'oppname' + uniqueId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      oppId = createOpportunity?.data?.createOpportunity.id ?? '';

      const nonChallengeMemebrs = await getOpportunityDataCodegen(
        oppId,
        TestUser.HUB_MEMBER
      );
      const result = nonChallengeMemebrs?.data?.lookup.opportunity;

      // Assert
      expect(result?.community?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_update_delete_grant_addMember_Invite.sort()
      );

      expect(
        result?.collaboration?.authorization?.myPrivileges?.sort()
      ).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute.sort()
      );

      expect(result?.authorization?.myPrivileges?.sort()).toEqual(
        sorted__create_read_update_delete_grant.sort()
      );
    });

    test('user member only of a space, check privileges on opportunity level', async () => {
      // Act
      const createOpportunity = await createOpportunityCodegen(
        'oppname',
        'oppname-x11',
        entitiesId.challengeId,
        TestUser.GLOBAL_ADMIN
      );

      oppId = createOpportunity?.data?.createOpportunity.id ?? '';

      const nonChallengeMemebrs = await getOpportunityDataCodegen(
        oppId,
        TestUser.HUB_MEMBER
      );
      const result = nonChallengeMemebrs?.data?.lookup.opportunity;
      const communityPrivileges = await getUserCommunityPrivilegeToOpportunityCodegen(
        entitiesId.spaceId,
        oppId,
        true,
        TestUser.HUB_MEMBER
      );
      const resultOpp = communityPrivileges?.data?.space?.opportunity;

      // Assert
      expect(resultOpp?.community?.authorization?.myPrivileges).toEqual(read);

      expect(
        result?.collaboration?.authorization?.myPrivileges?.sort()
      ).toEqual(read_createRelation_contribute.sort());

      expect(resultOpp?.authorization?.myPrivileges).toEqual(read);
    });
  });

  describe('DDT user privileges to update challenge preferences', () => {
    // Arrange
    test.each`
      userRole                    | message
      ${TestUser.GLOBAL_ADMIN}    | ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers}
      ${TestUser.HUB_ADMIN}       | ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers}
      ${TestUser.CHALLENGE_ADMIN} | ${ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers}
    `(
      'User: "$userRole" get message: "$message", who intend to update challenge preference ',
      async ({ userRole, message }) => {
        // Act
        const updateOrganizationPref = await changePreferenceChallengeCodegen(
          entitiesId.challengeId,
          ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
          'false',
          userRole
        );

        // Assert
        expect(
          updateOrganizationPref?.data?.updatePreferenceOnChallenge.definition
            .type
        ).toContain(message);
      }
    );

    test.each`
      userRole                     | message
      ${TestUser.HUB_MEMBER}       | ${"unable to grant 'update' privilege: challenge preference update"}
      ${TestUser.CHALLENGE_MEMBER} | ${"unable to grant 'update' privilege: challenge preference update"}
      ${TestUser.NON_HUB_MEMBER}   | ${"unable to grant 'update' privilege: challenge preference update"}
    `(
      'User: "$userRole" get message: "$message", who intend to update challenge preference ',
      async ({ userRole, message }) => {
        // Act
        const updateOrganizationPref = await changePreferenceChallengeCodegen(
          entitiesId.challengeId,
          ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
          'false',
          userRole
        );

        // Assert
        expect(updateOrganizationPref?.error?.errors[0].message).toContain(
          message
        );
      }
    );
  });

  test('non challenge member joins challenge community', async () => {
    // Arrange
    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.challengeCommunityId, TestUser.HUB_MEMBER);

    const query = await getChallengeDataCodegen(
      entitiesId.challengeId,
      TestUser.HUB_MEMBER
    );
    const userJoins = query?.data?.lookup?.challenge?.community;

    // Assert
    expect(userJoins?.memberUsers).toHaveLength(6);
    expect(userJoins?.leadUsers).toHaveLength(1);
    expect(userJoins?.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await removeCommunityRoleFromUserCodegen(
      users.spaceMemberId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
  });

  test('throw error for joining the same challenge community twice', async () => {
    // Arrange
    await changePreferenceChallengeCodegen(
      entitiesId.challengeId,
      ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.challengeCommunityId, TestUser.HUB_MEMBER);

    const userJoinSecondTime = await joinCommunity(
      entitiesId.challengeCommunityId,
      TestUser.HUB_MEMBER
    );

    expect(userJoinSecondTime.text).toContain(
      `Agent (${users.spaceMemberEmail}) already has assigned credential: challenge-member`
    );

    await removeCommunityRoleFromUserCodegen(
      users.spaceMemberId,
      entitiesId.challengeCommunityId,
      CommunityRole.Member
    );
  });

  describe('User with rights to join / apply one Challenge, cannot perform to another Challenge ', () => {
    test("Challenge 1 has all preference true, challenge 2: false (except 'ALLOW_NON_MEMBERS_READ_ACCESS')", async () => {
      // Arrange
      const responseChallenge = await createChallengeCodegen(
        challengeName + '2',
        `chnameid2${uniqueId}`,
        entitiesId.spaceId
      );
      challengeId2 = responseChallenge?.data?.createChallenge.id ?? '';

      await updateAllChallengePreferences(entitiesId.challengeId, 'true');
      await updateAllChallengePreferences(challengeId2, 'false');
      await changePreferenceChallengeCodegen(
        challengeId2,
        ChallengePreferenceType.AllowNonMembersReadAccess,
        'true'
      );

      // Act
      const response = await getChallengeDataCodegen(
        challengeId2,
        TestUser.HUB_MEMBER
      );

      // Assert
      expect(
        response?.data?.lookup?.challenge?.community?.authorization
      ).toEqual({
        anonymousReadAccess: false,
        myPrivileges: ['READ'],
      });

      await removeChallenge(challengeId2);
    });
  });
});
