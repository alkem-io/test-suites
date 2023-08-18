import {
  PostTypes,
  createPostOnCallout,
  getDataPerChallengeCallout,
  getDataPerSpaceCallout,
} from '@test/functional-api/integration/post/post.request.params';
import {
  getChallengeData,
  removeChallenge,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import {
  createChallengeForOrgSpace,
  createOrgAndSpace,
} from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_updateInnovationFlow_createOpportunity,
  sorted__create_read_update_delete_grant_contribute_calloutPublished,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted_sorted__create_read_update_delete_grant_contribute_movePost,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted__create_read_update_delete_grant_addMember_Invite,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
  sorted__create_read_update_delete_grant_createOpportunity,
} from '../../common';
import {
  RoleType,
  assignCommunityRoleToUser,
} from '@test/functional-api/integration/community/community.request.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await createChallengeForOrgSpace(challengeName);

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
      entitiesId.spaceCommunityId,
      users.qaUserId
    )
  );

  await assignCommunityRoleToUser(
    users.spaceAdminEmail,
    entitiesId.spaceCommunityId,
    RoleType.LEAD
  );

  await createApplication(entitiesId.challengeCommunityId, TestUser.QA_USER);

  // await mutation(
  //   createDiscussion,
  //   createDiscussionVariablesData(
  //     entitiesId.challengeCommunicationId,
  //     DiscussionCategory.GENERAL,
  //     'test'
  //   )
  // );

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

  await createPostOnCallout(
    entitiesId.challengeCalloutId,
    'postnameid',
    { profileData: { displayName: 'postDisplayName' } },
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges', () => {
  test('GlobalSpaceAdmin privileges to Challenge', async () => {
    // Act
    const response = await getChallengeData(
      entitiesId.spaceId,
      entitiesId.challengeId,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response.body.data.space.challenge.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_createOpportunity
    );
  });

  describe('Community', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.body.data.space.challenge.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_addMember_Invite
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.community.applications[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.body.data.space.challenge.community.communication.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalSpaceAdmin privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.community.communication
          .discussions[0].authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.community.communication.updates
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.body.data.space.challenge.collaboration.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Relations', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.body.data.space.challenge.collaboration.relations[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'CREATE_RELATION',
        'CREATE_CALLOUT',
      ]);
    });

    test('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.body.data.space.challenge.collaboration.callouts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerChallengeCallout(
        entitiesId.spaceId,
        entitiesId.challengeId,
        entitiesId.challengeCalloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_contribute_movePost
      );
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_WHITEBOARD',
        'CREATE_COMMENT',
      ]);
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.body.data.space.challenge.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_WHITEBOARD',
        'CREATE_COMMENT',
      ]);
    });
  });

  describe('Preferences', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeData(
        entitiesId.spaceId,
        entitiesId.challengeId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data = response.body.data.space.challenge.preferences;

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(
          sorted__create_read_update_delete_grant
        );
      });
    });
  });
});
