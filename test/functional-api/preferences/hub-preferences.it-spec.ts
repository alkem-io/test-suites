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
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  removeUserAsCommunityMember,
  removeUserMemberFromCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  removeUserAsHubAdmin,
  userAsHubAdminVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  createTestHub,
  getHubData,
  removeHub,
} from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { joinCommunity } from '@test/functional-api/user-management/application/application.request.params';
import { createOrgAndHubWithUsers } from '../zcommunications/create-entities-with-users-helper';
import { entitiesId, users } from '../zcommunications/communications-helper';
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

const organizationName = 'h-pref-org-name' + uniqueId;
const hostNameId = 'h-pref-org-nameid' + uniqueId;
const hubName = 'h-pref-eco-name' + uniqueId;
const hubNameId = 'h-pref-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.APPLICATIONS_FROM_ANYONE,
    'false'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'false'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
    'false'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
    'false'
  );
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Hub Preferences - member create challenge preference', () => {
  beforeAll(async () => {
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );
  });

  afterAll(async () => {
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );
  });
  test('User Member of a hub creates a challenge and child entities', async () => {
    // Arrange
    const response = await createChallengePredefinedData(
      'challengeName',
      'chal-texti',
      entitiesId.hubId,
      TestUser.HUB_MEMBER
    );
    const createChaRes = response.body.data.createChallenge;
    const chId = createChaRes.id;
    const chCollaborationId = createChaRes.collaboration.id;
    const chaCommunityId = createChaRes.community.id;

    const resCallout = await createCalloutOnCollaboration(
      chCollaborationId,
      'calloutDisplayName',
      'calloutname-id',
      'description',
      CalloutState.OPEN,
      CalloutType.CARD,
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
      'opp-name-id',
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

  test('User Member of a hub cannot modify entities created from another user under another challenge', async () => {
    // Arrange
    const response = await createChallengePredefinedData(
      'challengeName2',
      'chal-name-id2',
      entitiesId.hubId,
      TestUser.QA_USER
    );
    const createChaRes = response.body.data.createChallenge;
    const chId = createChaRes.id;
    const chCollaborationId = createChaRes.collaboration.id;
    const chaCommunityId = createChaRes.community.id;

    const resCallout = await createCalloutOnCollaboration(
      chCollaborationId,
      'calloutDisplayName',
      'calloutname-id',
      'description',
      CalloutState.OPEN,
      CalloutType.CARD,
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
      'opp-name-id',
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

describe('Hub preferences', () => {
  describe('DDT non-hub member community privileges', () => {
    // Arrange
    test.each`
      preferenceType                                               | value      | expectedPrefenceValue                                        | expectedCommunityMyPrivileges
      ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'true'}  | ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${['READ']}
      ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${'false'} | ${HubPreferenceType.ANONYMOUS_READ_ACCESS}                   | ${[]}
      ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'true'}  | ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${['COMMUNITY_APPLY']}
      ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${'false'} | ${HubPreferenceType.APPLICATIONS_FROM_ANYONE}                | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'true'}  | ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${['COMMUNITY_JOIN']}
      ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${'false'} | ${HubPreferenceType.JOIN_HUB_FROM_ANYONE}                    | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'true'}  | ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
      ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${'false'} | ${HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS} | ${[]}
    `(
      'Non-hub member should have privileges: "$expectedCommunityMyPrivileges" for hub with preference: "$preferenceType": "$value"',
      async ({
        preferenceType,
        value,
        expectedPrefenceValue,
        expectedCommunityMyPrivileges,
      }) => {
        const updateHubPref = await changePreferenceHub(
          entitiesId.hubId,
          preferenceType,
          value
        );

        const nonHubQueryMemebrs = await getHubData(
          entitiesId.hubId,
          TestUser.NON_HUB_MEMBER
        );

        // Assert
        expect(updateHubPref.body.data.updatePreferenceOnHub.value).toEqual(
          value
        );
        expect(
          updateHubPref.body.data.updatePreferenceOnHub.definition.type
        ).toEqual(expectedPrefenceValue);
        expect(
          nonHubQueryMemebrs.body.data.hub.community.authorization
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
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
        'true'
      );
    });
    afterEach(async () => {
      await removeChallenge(challengeId);
    });

    afterAll(async () => {
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
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
      'User: "$userRole" get message: "$message", whe intend to update hub preference ',
      async ({ userRole, message }) => {
        // Act
        const response = await createChallengePredefinedData(
          'challengeName',
          'chal-texti',
          entitiesId.hubId,
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

  describe('DDT user privileges to update hub preferences', () => {
    afterAll(async () => {
      await mutation(
        removeUserAsHubAdmin,
        userAsHubAdminVariablesData(users.hubAdminId, entitiesId.hubId)
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.hubCommunityId,
          users.hubAdminId
        )
      );

      await mutation(
        removeUserAsCommunityMember,
        removeUserMemberFromCommunityVariablesData(
          entitiesId.hubCommunityId,
          users.hubMemberId
        )
      );
    });
    // Arrange
    test.each`
      userRole                   | message
      ${TestUser.GLOBAL_ADMIN}   | ${'"data":{"updatePreferenceOnHub"'}
      ${TestUser.HUB_ADMIN}      | ${'"data":{"updatePreferenceOnHub"'}
      ${TestUser.HUB_MEMBER}     | ${'errors'}
      ${TestUser.NON_HUB_MEMBER} | ${'errors'}
    `(
      'User: "$userRole" get message: "$message", whe intend to update hub preference ',
      async ({ userRole, message }) => {
        // Act
        const updateHubPref = await changePreferenceHub(
          entitiesId.hubId,
          HubPreferenceType.JOIN_HUB_FROM_ANYONE,
          'false',
          userRole
        );

        // Assert
        expect(updateHubPref.text).toContain(message);
      }
    );
  });

  test('GA set hub preferences MEMBERSHIP_JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS to true nonHubMember, member of Organization', async () => {
    // Arrange
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(
        entitiesId.organizationId,
        users.nonHubMemberId
      )
    );

    // Act
    let updateHubPref = await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'true'
    );
    const nonHubQueryMemebrs = await getHubData(
      entitiesId.hubId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert
    expect(updateHubPref.statusCode).toEqual(200);
    expect(updateHubPref.body.data.updatePreferenceOnHub.value).toEqual('true');
    expect(
      updateHubPref.body.data.updatePreferenceOnHub.definition.type
    ).toEqual(HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS);

    expect(nonHubQueryMemebrs.body.data.hub.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['COMMUNITY_JOIN'],
    });
    updateHubPref = await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'false'
    );
  });

  test('nonHubMember member joins Hub community', async () => {
    // Arrange
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.hubCommunityId);
    const query = await getHubData(entitiesId.hubId, TestUser.NON_HUB_MEMBER);
    const userJoins = query.body.data.hub.community;

    // Assert
    expect(userJoins.memberUsers).toHaveLength(3);
    expect(userJoins.leadUsers).toHaveLength(0);
    expect(query.body.data.hub.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_JOIN'],
    });

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
  });

  test('throw error for joining the same community twice', async () => {
    // Arrange
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    // Act
    await joinCommunity(entitiesId.hubCommunityId);

    const userJoinSecondTime = await joinCommunity(entitiesId.hubCommunityId);

    expect(userJoinSecondTime.text).toContain(
      `Agent (${users.nonHubMemberEmail}) already has assigned credential: hub-member`
    );

    await mutation(
      removeUserAsCommunityMember,
      removeUserMemberFromCommunityVariablesData(
        entitiesId.hubCommunityId,
        users.nonHubMemberId
      )
    );
  });

  test('GA set all hub preferences to true and nonHubMember is member of Organization', async () => {
    // Arrange
    await mutation(
      assignUserToOrganization,
      assignUserToOrganizationVariablesData(
        entitiesId.organizationId,
        users.nonHubMemberId
      )
    );

    // Act
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
      'true'
    );

    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ANONYMOUS_READ_ACCESS,
      'true'
    );

    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.JOIN_HUB_FROM_ANYONE,
      'true'
    );

    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.APPLICATIONS_FROM_ANYONE,
      'true'
    );

    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ALLOW_MEMBERS_TO_CREATE_CHALLENGES,
      'true'
    );

    const nonHubQueryMemebrs = await getHubData(
      entitiesId.hubId,
      TestUser.NON_HUB_MEMBER
    );

    // Assert

    expect(nonHubQueryMemebrs.body.data.hub.community.authorization).toEqual({
      anonymousReadAccess: false,
      myPrivileges: ['READ', 'COMMUNITY_APPLY', 'COMMUNITY_JOIN'],
    });
  });
  describe('User with rights to join / apply one Hub, cannot perform to another Hub ', () => {
    test('Hub 1 has all preference true, hub 2: false', async () => {
      // Arrange
      await mutation(
        assignUserToOrganization,
        assignUserToOrganizationVariablesData(
          entitiesId.organizationId,
          users.nonHubMemberId
        )
      );

      // Act
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
        'true'
      );

      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );

      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.JOIN_HUB_FROM_ANYONE,
        'true'
      );

      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.APPLICATIONS_FROM_ANYONE,
        'true'
      );

      const responseHub2 = await createTestHub(
        hubName + '2',
        hubNameId + '2',
        entitiesId.organizationId
      );

      const hubId2 = responseHub2.body.data.createHub.id;
      await changePreferenceHub(
        hubId2,
        HubPreferenceType.APPLICATIONS_FROM_ANYONE,
        'false'
      );
      const nonHubQueryMemebrs = await getHubData(
        hubId2,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(nonHubQueryMemebrs.body.data.hub.community.authorization).toEqual({
        anonymousReadAccess: false,
        myPrivileges: [],
      });

      await removeHub(hubId2);
    });
  });
});
