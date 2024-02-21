import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  createTestSpaceCodegen,
  getUserCommunityPrivilegeToSpaceCodegen,
  deleteSpaceCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteChallengeCodegen } from '../journey/challenge/challenge.request.params';
import { createCalloutOnCollaborationCodegen } from '../callout/callouts.request.params';
import { deleteOpportunityCodegen } from '../journey/opportunity/opportunity.request.params';
import { users } from '@test/utils/queries/users-data';
import { CommunityRole, SpacePreferenceType } from '@alkemio/client-lib';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { createChallengeCodegen } from '@test/utils/mutations/journeys/challenge';
import { createOpportunityCodegen } from '@test/utils/mutations/journeys/opportunity';
import { entitiesId } from '../roles/community/communications-helper';
import {
  assignCommunityRoleToUserCodegen,
  removeCommunityRoleFromUserCodegen,
  assignUserToOrganizationCodegen,
  joinCommunityCodegen,
} from '../roles/roles-request.params';

const organizationName = 'h-pref-org-name' + uniqueId;
const hostNameId = 'h-pref-org-nameid' + uniqueId;
const spaceName = 'h-pref-eco-name' + uniqueId;
const spaceNameId = 'h-pref-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await assignCommunityRoleToUserCodegen(
    users.qaUserId,
    entitiesId.spaceCommunityId,
    CommunityRole.Member
  );

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipApplicationsFromAnyone,
    'false'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromAnyone,
    'false'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
    'false'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AllowMembersToCreateChallenges,
    'false'
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Space Preferences - member create challenge preference', () => {
  beforeAll(async () => {
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateChallenges,
      'true'
    );
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateCallouts,
      'true'
    );
  });

  afterAll(async () => {
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateChallenges,
      'false'
    );

    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateCallouts,
      'false'
    );
  });
  test('User Member of a space creates a challenge and child entities', async () => {
    // Arrange
    const chDisplayName = 'challengeName';
    const response = await createChallengeCodegen(
      chDisplayName,
      'chal-texti',
      entitiesId.spaceId,
      TestUser.HUB_MEMBER
    );
    const createChaRes = response?.data?.createChallenge;
    const chId = createChaRes?.id ?? '';
    const chaCommunityId = createChaRes?.community?.id ?? '';

    const calloutDisplayName = 'calloutDisplayName';
    const resCallout = await createCalloutOnCollaborationCodegen(
      entitiesId.spaceCollaborationId,
      {
        framing: {
          profile: {
            displayName: calloutDisplayName,
          },
        },
      },
      TestUser.HUB_MEMBER
    );
    const calloutData = resCallout?.data?.createCalloutOnCollaboration;

    const resAssignMember = await assignCommunityRoleToUserCodegen(
      users.qaUserId,
      chaCommunityId,
      CommunityRole.Member
    );

    const oppDisplayName = 'oppdisplayname';

    const resCreateOpp = await createOpportunityCodegen(
      oppDisplayName,
      oppDisplayName,
      chId,
      TestUser.HUB_MEMBER
    );

    const createOppRes = resCreateOpp?.data?.createOpportunity;
    const oppId = createOppRes?.id ?? '';

    // Assert
    expect(createChaRes?.profile.displayName).toEqual(chDisplayName);
    expect(calloutData?.framing?.profile.displayName).toEqual(
      calloutDisplayName
    );
    expect(resAssignMember?.data?.assignCommunityRoleToUser.email).toContain(
      users.qaUserEmail
    );
    expect(createOppRes?.profile.displayName).toEqual(oppDisplayName);

    await deleteOpportunityCodegen(oppId);
    await deleteChallengeCodegen(chId);
  });

  test('User Member of a space cannot modify entities created from another user under another challenge', async () => {
    // Arrange
    const chDisplayName = 'challengeName2';

    const response = await createChallengeCodegen(
      chDisplayName,
      'chal-name-id2',
      entitiesId.spaceId,
      TestUser.QA_USER
    );
    const createChaRes = response?.data?.createChallenge;
    const chId = createChaRes?.id ?? '';

    const chCollaborationId = createChaRes?.collaboration?.id ?? '';

    const chaCommunityId = createChaRes?.community?.id ?? '';

    const resCallout = await createCalloutOnCollaborationCodegen(
      chCollaborationId,
      {
        framing: {
          profile: {
            displayName: 'calloutDisplayName2',
          },
        },
      },
      TestUser.HUB_MEMBER
    );

    const resAssignMember = await assignCommunityRoleToUserCodegen(
      users.qaUserId,
      chaCommunityId,
      CommunityRole.Admin
    );

    const oppDisplayName = 'oppdisplayname2';

    const resCreateOpp = await createOpportunityCodegen(
      oppDisplayName,
      'opportunityname',
      chId,
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(createChaRes?.profile.displayName).toEqual(chDisplayName);
    expect(resCallout?.error?.errors[0].message).toContain(
      "Authorization: unable to grant 'create-callout' privilege: create callout on collaboration"
    );
    expect(resAssignMember?.error?.errors[0].message).toContain(
      'Agent (qa.user@alkem.io) already has assigned credential: challenge-admin'
    );
    expect(resCreateOpp?.error?.errors[0].message).toContain(
      "Authorization: unable to grant 'create-opportunity' privilege: opportunityCreate"
    );

    await deleteChallengeCodegen(chId);
  });
});

describe('Space preferences', () => {
  describe('DDT non-space member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                                        | value      | expectedPrefenceValue                                                 | expectedCommunityMyPrivileges
      ${SpacePreferenceType.AuthorizationAnonymousReadAccess}               | ${'true'}  | ${SpacePreferenceType.AuthorizationAnonymousReadAccess}               | ${['READ']}
      ${SpacePreferenceType.AuthorizationAnonymousReadAccess}               | ${'false'} | ${SpacePreferenceType.AuthorizationAnonymousReadAccess}               | ${[]}
      ${SpacePreferenceType.MembershipApplicationsFromAnyone}               | ${'true'}  | ${SpacePreferenceType.MembershipApplicationsFromAnyone}               | ${['COMMUNITY_APPLY']}
      ${SpacePreferenceType.MembershipApplicationsFromAnyone}               | ${'false'} | ${SpacePreferenceType.MembershipApplicationsFromAnyone}               | ${[]}
      ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}                  | ${'true'}  | ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}                  | ${['COMMUNITY_JOIN']}
      ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}                  | ${'false'} | ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}                  | ${[]}
      ${SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers} | ${'true'}  | ${SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers} | ${[]}
      ${SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers} | ${'false'} | ${SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers} | ${[]}
    `(
      'Non-space member should have privileges: "$expectedCommunityMyPrivileges" for space with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        const updateSpacePref = await changePreferenceSpaceCodegen(
          entitiesId.spaceId,
          preferenceType,
          value
        );

        const query = await getUserCommunityPrivilegeToSpaceCodegen(
          entitiesId.spaceId,
          entitiesId.spaceCommunityId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(updateSpacePref?.data?.updatePreferenceOnSpace.value).toEqual(
          value
        );
        expect(
          updateSpacePref?.data?.updatePreferenceOnSpace.definition.type
        ).toEqual(expectedPrefenceValue);
        expect(query?.data?.space.spaceCommunity?.authorization).toEqual({
          myPrivileges: expectedCommunityMyPrivileges,
        });
      }
    );
  });

  describe('DDT user privileges to create challenge', () => {
    let challengeId = '';
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AllowMembersToCreateChallenges,
        'true'
      );
    });
    afterEach(async () => {
      await deleteChallengeCodegen(challengeId);
    });

    afterAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AllowMembersToCreateChallenges,
        'false'
      );
    });
    const chNameId = 'chal-texti';
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${chNameId}
      ${TestUser.HUB_ADMIN}      | ${chNameId}
      ${TestUser.HUB_MEMBER}     | ${chNameId}
      ${TestUser.NON_HUB_MEMBER} | ${undefined}
    `(
      'User: "$userRole" get message: "$message", when intend to update space preference ',
      async ({ userRole, message }) => {
        // Act
        const response = await createChallengeCodegen(
          'challengeName',
          chNameId,
          entitiesId.spaceId,
          userRole
        );
        if (!response?.error?.errors[0].message.includes('errors')) {
          challengeId = response?.data?.createChallenge.id ?? '';
        }
        // Assert
        expect(response?.data?.createChallenge.nameID).toEqual(message);
      }
    );
  });

  describe('DDT user privileges to update space preferences', () => {
    afterAll(async () => {
      await removeCommunityRoleFromUserCodegen(
        users.spaceAdminId,
        entitiesId.spaceId,
        CommunityRole.Admin
      );

      await removeCommunityRoleFromUserCodegen(
        users.spaceAdminId,
        entitiesId.spaceId,
        CommunityRole.Member
      );

      await removeCommunityRoleFromUserCodegen(
        users.spaceMemberId,
        entitiesId.spaceId,
        CommunityRole.Member
      );
    });
    // Arrange
    test.each`
      userRole                 | message
      ${TestUser.GLOBAL_ADMIN} | ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}
      ${TestUser.HUB_ADMIN}    | ${SpacePreferenceType.MembershipJoinSpaceFromAnyone}
    `(
      'User: "$userRole" get message: "$message", when intend to update space preference ',
      async ({ userRole, message }) => {
        // Act
        const updateSpacePref = await changePreferenceSpaceCodegen(
          entitiesId.spaceId,
          SpacePreferenceType.MembershipJoinSpaceFromAnyone,
          'false',
          userRole
        );
        // Assert
        expect(
          updateSpacePref?.data?.updatePreferenceOnSpace?.definition?.type
        ).toEqual(message);
      }
    );

    test.each`
      userRole                   | message
      ${TestUser.HUB_MEMBER}     | ${"unable to grant 'update' privilege: space preference update"}
      ${TestUser.NON_HUB_MEMBER} | ${"unable to grant 'update' privilege: space preference update"}
    `(
      'User: "$userRole" get message: "$message", when intend to update space preference ',
      async ({ userRole, message }) => {
        // Act
        const updateSpacePref = await changePreferenceSpaceCodegen(
          entitiesId.spaceId,
          SpacePreferenceType.MembershipJoinSpaceFromAnyone,
          'false',
          userRole
        );
        // Assert
        expect(updateSpacePref?.error?.errors[0].message).toContain(message);
      }
    );
  });

  test('GA set space preferences MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS to true nonSpaceMember, member of Organization', async () => {
    // Arrange
    await assignUserToOrganizationCodegen(
      users.nonSpaceMemberId,
      entitiesId.organizationId
    );

    // Act
    let updateSpacePref = await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
      'true'
    );
    const nonSpaceQueryMemebrs = await getUserCommunityPrivilegeToSpaceCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(updateSpacePref?.data?.updatePreferenceOnSpace.value).toEqual(
      'true'
    );
    expect(
      updateSpacePref?.data?.updatePreferenceOnSpace.definition.type
    ).toEqual(
      SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers
    );

    expect(
      nonSpaceQueryMemebrs?.data?.space.spaceCommunity?.authorization ?? ''
    ).toEqual({
      myPrivileges: ['COMMUNITY_JOIN'],
    });
    updateSpacePref = await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
      'false'
    );
  });

  test('nonSpaceMember member joins Space community', async () => {
    // Arrange
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromAnyone,
      'true'
    );

    // Act
    await joinCommunityCodegen(
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );
    const query = await getUserCommunityPrivilegeToSpaceCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );
    const userJoins = query?.data?.space.spaceCommunity;

    // Assert

    expect(userJoins?.authorization).toEqual({
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.spaceId,
      CommunityRole.Member
    );
  });

  test('throw error for joining the same community twice', async () => {
    // Arrange
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromAnyone,
      'true'
    );

    // Act
    await joinCommunityCodegen(
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    const userJoinSecondTime = await joinCommunityCodegen(
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    expect(userJoinSecondTime.error?.errors[0]?.message).toContain(
      'already has assigned credential: space-member'
    );

    await removeCommunityRoleFromUserCodegen(
      users.nonSpaceMemberId,
      entitiesId.spaceId,
      CommunityRole.Member
    );
  });

  test('GA set all space preferences to true and nonSpaceMember is member of Organization', async () => {
    // Arrange

    await assignUserToOrganizationCodegen(
      users.nonSpaceMemberId,
      entitiesId.organizationId
    );

    // Act
    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
      'true'
    );

    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AuthorizationAnonymousReadAccess,
      'true'
    );

    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipJoinSpaceFromAnyone,
      'true'
    );

    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.MembershipApplicationsFromAnyone,
      'true'
    );

    await changePreferenceSpaceCodegen(
      entitiesId.spaceId,
      SpacePreferenceType.AllowMembersToCreateChallenges,
      'true'
    );

    const nonSpaceQueryMemebrs = await getUserCommunityPrivilegeToSpaceCodegen(
      entitiesId.spaceId,
      entitiesId.spaceCommunityId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(
      nonSpaceQueryMemebrs?.data?.space?.spaceCommunity?.authorization
    ).toEqual({
      myPrivileges: ['READ', 'COMMUNITY_APPLY', 'COMMUNITY_JOIN'],
    });
  });
  describe('User with rights to join / apply one Space, cannot perform to another Space ', () => {
    test('Space 1 has all preference true, space 2: false', async () => {
      // Arrange

      await assignUserToOrganizationCodegen(
        users.nonSpaceMemberId,
        entitiesId.organizationId
      );

      // Act
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
        'true'
      );

      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'true'
      );

      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.MembershipJoinSpaceFromAnyone,
        'true'
      );

      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.MembershipApplicationsFromAnyone,
        'true'
      );

      const responseSpace2 = await createTestSpaceCodegen(
        spaceName + '2',
        spaceNameId + '2',
        entitiesId.organizationId
      );

      const space2Data = responseSpace2?.data?.createSpace;
      const spaceId2 = space2Data?.id ?? '';
      const spaceCommunityId2 = space2Data?.community?.id ?? '';
      await changePreferenceSpaceCodegen(
        spaceId2,
        SpacePreferenceType.MembershipApplicationsFromAnyone,
        'false'
      );
      const nonSpaceQueryMemebrs = await getUserCommunityPrivilegeToSpaceCodegen(
        spaceId2,
        spaceCommunityId2,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(
        nonSpaceQueryMemebrs?.data?.space?.spaceCommunity?.authorization
      ).toEqual({
        myPrivileges: [],
      });

      await deleteSpaceCodegen(spaceId2);
    });
  });
});
