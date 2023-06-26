import { mutation } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
  assignUserToOrganization,
  assignUserToOrganizationVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  removeUserAsSpaceAdmin,
  userAsSpaceAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createTestSpace,
  getSpaceData,
  removeSpace,
} from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import { createOrgAndSpaceWithUsers } from '../zcommunications/create-entities-with-users-helper';
import { entitiesId } from '../zcommunications/communications-helper';
import {
  createChallengePredefinedData,
  removeChallenge,
} from '../integration/challenge/challenge.request.params';
import { createCalloutOnCollaboration } from '../integration/callouts/callouts.request.params';
import {
  CalloutState,
  CalloutType,
} from '../integration/callouts/callouts-enum';
import {
  createOpportunityPredefinedData,
  removeOpportunity,
} from '../integration/opportunity/opportunity.request.params';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'h-pref-org-name' + uniqueId;
const hostNameId = 'h-pref-org-nameid' + uniqueId;
const spaceName = 'h-pref-eco-name' + uniqueId;
const spaceNameId = 'h-pref-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.spaceCommunityId,
      users.qaUserId
    )
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.APPLICATIONS_FROM_ANYONE,
    'false'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
    'false'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
    'false'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
    'false'
  );
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Space Preferences - member create challenge preference', () => {
  beforeAll(async () => {
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );
  });

  afterAll(async () => {
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'false'
    );
  });
  test('User Member of a space creates a challenge and child entities', async () => {
    // Arrange
    const response = await createChallengePredefinedData(
      'challengeName',
      'chal-texti',
      entitiesId.spaceId,
      TestUser.HUB_MEMBER
    );
    const createChaRes = response.body.data.createChallenge;
    const chId = createChaRes.id;
    const chCollaborationId = createChaRes.collaboration.id;
    const chaCommunityId = createChaRes.community.id;

    const resCallout = await createCalloutOnCollaboration(
      chCollaborationId,
      {
        profile: {
          displayName: 'calloutDisplayName',
        },
      },
      TestUser.HUB_MEMBER
    );

    const resAssignMember = await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(chaCommunityId, users.qaUserId),
      TestUser.HUB_MEMBER
    );

    const resCreateOpp = await createOpportunityPredefinedData(
      chId,
      'opportunityName',
      TestUser.HUB_MEMBER
    );
    const createOppRes = resCreateOpp.body.data.createOpportunity;
    const oppId = createOppRes.id;

    // Assert
    expect(response.text).toContain('createChallenge');
    expect(resCallout.text).toContain('createCalloutOnCollaboration');
    expect(resAssignMember.text).toContain('assignUserAsCommunityMember');
    expect(resCreateOpp.text).toContain('createOpportunity');

    await removeOpportunity(oppId);
    await removeChallenge(chId);
  });

  test('User Member of a space cannot modify entities created from another user under another challenge', async () => {
    // Arrange
    const response = await createChallengePredefinedData(
      'challengeName2',
      'chal-name-id2',
      entitiesId.spaceId,
      TestUser.QA_USER
    );
    const createChaRes = response.body.data.createChallenge;
    const chId = createChaRes.id;
    const chCollaborationId = createChaRes.collaboration.id;
    const chaCommunityId = createChaRes.community.id;

    const resCallout = await createCalloutOnCollaboration(
      chCollaborationId,
      {
        profile: {
          displayName: 'calloutDisplayName',
        },
      },
      TestUser.HUB_MEMBER
    );

    const resAssignMember = await mutation(
      assignUserAsCommunityMember,
      assignUserAsCommunityMemberVariablesData(chaCommunityId, users.qaUserId),
      TestUser.HUB_MEMBER
    );

    const resCreateOpp = await createOpportunityPredefinedData(
      chId,
      'opportunityName',
      TestUser.HUB_MEMBER
    );

    // Assert
    expect(response.text).toContain('"data":{"createChallenge');
    expect(resCallout.text).not.toContain(
      '"data":{"createCalloutOnCollaboration'
    );
    expect(resAssignMember.text).not.toContain(
      '"data":{"assignUserAsCommunityMember'
    );
    expect(resCreateOpp.text).not.toContain('"data":{"createOpportunity');
    expect(resCallout.text).toContain('errors');
    expect(resAssignMember.text).toContain('errors');
    expect(resCreateOpp.text).toContain('errors');

    await removeChallenge(chId);
  });
});

describe('Space preferences', () => {
  describe('DDT non-space member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                                 | value      | expectedPrefenceValue                                          | expectedCommunityMyPrivileges
      ${SpacePreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'true'}  | ${SpacePreferenceType.ANONYMOUS_READ_ACCESS}                   | ${['READ']}
      ${SpacePreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'false'} | ${SpacePreferenceType.ANONYMOUS_READ_ACCESS}                   | ${[]}
      ${SpacePreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'true'}  | ${SpacePreferenceType.APPLICATIONS_FROM_ANYONE}                | ${['COMMUNITY_APPLY']}
      ${SpacePreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'false'} | ${SpacePreferenceType.APPLICATIONS_FROM_ANYONE}                | ${[]}
      ${SpacePreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'true'}  | ${SpacePreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${['COMMUNITY_JOIN']}
      ${SpacePreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'false'} | ${SpacePreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${[]}
      ${SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'true'}  | ${SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
      ${SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'false'} | ${SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
    `(
      'Non-space member should have privileges: "$expectedCommunityMyPrivileges" for space with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        const updateSpacePref = await changePreferenceSpace(
          entitiesId.spaceId,
          preferenceType,
          value
        );

        const nonSpaceQueryMemebrs = await getSpaceData(
          entitiesId.spaceId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(updateSpacePref.body.data.updatePreferenceOnSpace.value).toEqual(
          value
        );
        expect(
          updateSpacePref.body.data.updatePreferenceOnSpace.definition.type
        ).toEqual(expectedPrefenceValue);
        expect(
          nonSpaceQueryMemebrs.body.data.space.community.authorization
        ).toEqual({
          anonymousReadAccess: false,
          myPrivileges: expectedCommunityMyPrivileges,
        });
      }
    );
  });

  describe('DDT user privileges to create challenge', () => {
    let challengeId = '';
    beforeAll(async () => {
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
        'true'
      );
    });
    afterEach(async () => {
      await removeChallenge(challengeId);
    });

    afterAll(async () => {
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
        'false'
      );
    });

    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"createChallenge"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"createChallenge"'}
      ${TestUser.HUB_MEMBER}     | ${'"data":{"createChallenge"'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", whe intend to update space preference ',
      async ({ userRole, message }) => {
        // Act
        const response = await createChallengePredefinedData(
          'challengeName',
          'chal-texti',
          entitiesId.spaceId,
          userRole
        );
        if (!response.text.includes('errors')) {
          challengeId = response.body.data.createChallenge.id;
        }
        // Assert
        expect(response.text).toContain(message);
      }
    );
  });

  describe('DDT user privileges to update space preferences', () => {
    afterAll(async () => {
      await mutation(
        removeUserAsSpaceAdmin,
        userAsSpaceAdminVariablesData(users.spaceAdminId, entitiesId.spaceId)
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.spaceCommunityId,
          users.spaceAdminId
        )
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.spaceCommunityId,
          users.spaceMemberId
        )
      );
    });
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePreferenceOnSpace"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePreferenceOnSpace"'}
      ${TestUser.HUB_MEMBER}     | ${'errors'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", whe intend to update space preference ',
      async ({ userRole, message }) => {
        // Act
        const updateSpacePref = await changePreferenceSpace(
          entitiesId.spaceId,
          SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
          'false',
          userRole
        );

        // Assert
        expect(updateSpacePref.text).toContain(message);
      }
    );
  });

  test('GA set space preferences MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS to true nonSpaceMember, member of Organization', async () => {
    // Arrange
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(
        entitiesId.organizationId,
        users.nonSpaceMemberId
      )
    );

    // Act
    let updateSpacePref = await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'true'
    );
    const nonSpaceQueryMemebrs = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(updateSpacePref.statusCode).toEqual(200);
    expect(updateSpacePref.body.data.updatePreferenceOnSpace.value).toEqual(
      'true'
    );
    expect(
      updateSpacePref.body.data.updatePreferenceOnSpace.definition.type
    ).toEqual(SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS);

    expect(
      nonSpaceQueryMemebrs.body.data.space.community.authorization
    ).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['COMMUNITY_JOIN'],
    });
    updateSpacePref = await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'false'
    );
  });

  test('nonSpaceMember member joins Space community', async () => {
    // Arrange
    const queryBefore = await getSpaceData(entitiesId.spaceId);
    const counter = queryBefore.body.data.space.community.memberUsers;

    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.spaceCommunityId);
    const query = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    const userJoins = query.body.data.space.community;

    // Assert
    expect(userJoins.memberUsers.length).toEqual(counter.length + 1);
    expect(userJoins.leadUsers).toHaveLength(0);
    expect(query.body.data.space.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberId
      )
    );
  });

  test('throw error for joining the same community twice', async () => {
    // Arrange
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.spaceCommunityId);

    const userJoinSecondTime = await joinCommunity(entitiesId.spaceCommunityId);

    expect(userJoinSecondTime.text).toContain(
      'already has assigned credential: space-member'
    );

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.spaceCommunityId,
        users.nonSpaceMemberId
      )
    );
  });

  test('GA set all space preferences to true and nonSpaceMember is member of Organization', async () => {
    // Arrange
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(
        entitiesId.organizationId,
        users.nonSpaceMemberId
      )
    );

    // Act
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'true'
    );

    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ANONYMOUS_READ_ACCESS,
      'true'
    );

    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.APPLICATIONS_FROM_ANYONE,
      'true'
    );

    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );

    const nonSpaceQueryMemebrs = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert

    expect(
      nonSpaceQueryMemebrs.body.data.space.community.authorization
    ).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_APPLY', 'COMMUNITY_JOIN'],
    });
  });
  describe('User with rights to join / apply one Space, cannot perform to another Space ', () => {
    test('Space 1 has all preference true, space 2: false', async () => {
      // Arrange
      await mutation(
        assignUserToOrganization,
        assignUserToOrganizationVariablesData(
          entitiesId.organizationId,
          users.nonSpaceMemberId
        )
      );

      // Act
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
        'true'
      );

      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );

      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
        'true'
      );

      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.APPLICATIONS_FROM_ANYONE,
        'true'
      );

      const responseSpace2 = await createTestSpace(
        spaceName + '2',
        spaceNameId + '2',
        entitiesId.organizationId
      );

      const spaceId2 = responseSpace2.body.data.createSpace.id;
      await changePreferenceSpace(
        spaceId2,
        SpacePreferenceType.APPLICATIONS_FROM_ANYONE,
        'false'
      );
      const nonSpaceQueryMemebrs = await getSpaceData(
        spaceId2,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(
        nonSpaceQueryMemebrs.body.data.space.community.authorization
      ).toEqual({
        anonymousReadAccess: false,
        myPrivileges: [],
      });

      await removeSpace(spaceId2);
    });
  });
});
