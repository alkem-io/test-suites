import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerChallengeCalloutCodegen,
  getDataPerSpaceCallout,
} from '@test/functional-api/integration/post/post.request.params';
import {
  getChallengeDataCodegen,
  removeChallengeCodegen,
} from '@test/functional-api/integration/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/integration/space/space.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  readPrivilege,
  sorted__read_createRelation,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_addMember_Invite,
} from '../../common';
import {
  assignCommunityRoleToUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';
import {
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;
const challengeName = 'auth-ga-chal';

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await createChallengeForOrgSpaceCodegen(challengeName);

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
    users.qaUserId,
    entitiesId.spaceCommunityId,
    RoleType.LEAD
  );

  await createApplicationCodegen(
    entitiesId.challengeCommunityId,
    TestUser.QA_USER
  );

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

  await createPostOnCalloutCodegen(
    entitiesId.challengeCalloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );

  // await assignUserAsGlobalCommunityAdmin(users.spaceMemberId);
});
afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
  // await removeUserAsGlobalCommunityAdmin(users.spaceMemberId);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Space', async () => {
    // Act
    const response = await getChallengeDataCodegen(
      entitiesId.challengeId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data =
      response.data?.lookup.challenge?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.community?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_addMember_Invite
      );
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.applications?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalCommunityAdmin privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalCommunityAdmin privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.communication?.updates
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Relations', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.relations?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data).toEqual(['READ']);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerChallengeCalloutCodegen(
        entitiesId.challengeId,
        entitiesId.challengeCalloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.spaceCalloutId,
      //   TestUser.GLOBAL_COMMUNITY_ADMIN
      // );
      // const data =
      //   response.data?.space?.challenge.collaboration.callouts[0].posts[0]
      //     .authorization.myPrivileges;
      // // Assert
      // expect(data).toEqual(['READ']);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );

      const data =
        response.body.data.space.challenge.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('GlobalCommunityAdmin privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challengeId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data = response.data?.lookup.challenge?.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(readPrivilege);
      });
    });
  });
});
