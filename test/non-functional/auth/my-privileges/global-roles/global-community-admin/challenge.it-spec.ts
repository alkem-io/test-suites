import {
  AspectTypes,
  createAspectOnCallout,
  getDataPerChallengeCallout,
  getDataPerHubCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  getChallengeData,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgHub,
  createOrgAndHub,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  assignUserAsGlobalCommunityAdmin,
  removeUserAsGlobalCommunityAdmin,
} from '@test/utils/mutations/authorization-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
} from '@test/utils/mutations/communications-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import {
  sorted_cgrud_createComment_Privilege,
  sorted_cgrud_createDiscussion_Privilege,
  readPrivilege,
  read_creRel_sortedPrivileges,
  sortPrivileges,
} from '../../common';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await createChallengeForOrgHub(challengeName);

  await changePreferenceChallenge(
    entitiesId.challengeId,
    ChallengePreferenceType.APPLY_CHALLENGE_FROM_HUB_MEMBERS,
    'true'
  );

  await changePreferenceChallenge(
    entitiesId.challengeId,
    ChallengePreferenceType.JOIN_CHALLENGE_FROM_HUB_MEMBERS,
    'true'
  );
  await mutation(
    assignUserAsCommunityMember,
    assignUserAsCommunityMemberVariablesData(
      entitiesId.hubCommunityId,
      users.qaUserId
    )
  );

  await createApplication(entitiesId.challengeCommunityId, TestUser.QA_USER);

  await mutation(
    createDiscussion,
    createDiscussionVariablesData(
      entitiesId.challengeCommunicationId,
      DiscussionCategory.GENERAL,
      'test'
    )
  );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.challengeUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.challengeCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createAspectOnCallout(
    entitiesId.challengeCalloutId,
    'aspectDisplayName',
    'aspectnameid',
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );

  await assignUserAsGlobalCommunityAdmin(users.hubMemberId);
});
afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalCommunityAdmin(users.hubMemberId);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Hub', async () => {
    // Act
    const response = await getChallengeData(
      entitiesId.hubId,
      entitiesId.challengeId,
      TestUser.HUB_MEMBER
    );
    const data = response.body.data.hub.challenge.authorization.myPrivileges;

    // Assert
    expect(data).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data =
        response.body.data.hub.challenge.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.community.applications[0].authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data =
        response.body.data.hub.challenge.community.communication.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted_cgrud_createDiscussion_Privilege);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.community.communication.discussions[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted_cgrud_createComment_Privilege);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.community.communication.updates
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sortPrivileges);
    });
  });

  describe('Collaboration', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data =
        response.body.data.hub.challenge.collaboration.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(read_creRel_sortedPrivileges);
    });

    // Skip due to bug: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Relations', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data =
        response.body.data.hub.challenge.collaboration.relations[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['READ']);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data =
        response.body.data.hub.challenge.collaboration.callouts[0].authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Aspect', async () => {
      // Act
      const response = await getDataPerChallengeCallout(
        entitiesId.hubId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Canvas', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['READ']);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_MEMBER
      );

      const data =
        response.body.data.hub.challenge.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.hubId,
        entitiesId.challengeId,
        TestUser.HUB_MEMBER
      );
      const data = response.body.data.hub.challenge.preferences;

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(readPrivilege);
      });
    });
  });
});
