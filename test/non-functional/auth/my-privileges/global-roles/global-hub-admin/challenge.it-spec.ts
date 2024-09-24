import {
  createPostOnCalloutCodegen,
  getDataPerChallengeCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  deleteChallengeCodegen,
  getChallengeDataCodegen,
} from '@test/functional-api/journey/challenge/challenge.request.params';
import { deleteSpaceCodegen } from '@test/functional-api/journey/space/space.request.params';
import { createRelationCodegen } from '@test/functional-api/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceChallengeCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
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
  createChallengeForOrgSpaceCodegen,
  createOrgAndSpaceCodegen,
} from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { ChallengePreferenceType, CommunityRole } from '@alkemio/client-lib';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { assignRoleToUser } from '@test/functional-api/roles/roles-request.params';

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

  await changePreferenceChallengeCodegen(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipApplyChallengeFromSpaceMembers,
    'true'
  );

  await changePreferenceChallengeCodegen(
    entitiesId.challenge.id,
    ChallengePreferenceType.MembershipJoinChallengeFromSpaceMembers,
    'true'
  );

  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Member
  );
  await assignRoleToUser(
    users.qaUser.id,
    entitiesId.space.communityId,
    CommunityRoleType.Lead
  );

  await createApplicationCodegen(
    entitiesId.challenge.communityId,
    TestUser.QA_USER
  );

  await sendMessageToRoomCodegen(
    entitiesId.challenge.updatesId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelationCodegen(
    entitiesId.challenge.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCalloutCodegen(
    entitiesId.challenge.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteChallengeCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('GlobalSpaceAdmin privileges to Challenge', async () => {
    // Act
    const response = await getChallengeDataCodegen(
      entitiesId.challenge.id,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data =
      response.data?.lookup.challenge?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_createOpportunity
    );
  });

  describe('Community', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Community', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.community?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_addMember_Invite
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Application', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.applications?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Communication', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalSpaceAdmin privileges to Challenge / Community / Communication / Discussion', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.communication
          ?.discussions?.[0].authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Community / Communication / Updates', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.community?.communication?.updates
          ?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Collaboration', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Relations', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.relations?.[0]
          .authorization?.myPrivileges ?? [];

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
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerChallengeCalloutCodegen(
        entitiesId.challenge.id,
        entitiesId.challenge.calloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );

      const data =
        response.data?.lookup.challenge?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_contribute_movePost
      );
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.space.calloutId,
      //   TestUser.GLOBAL_HUBS_ADMIN
      // );
      // const data =
      //   response.data?.space.challenge.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data).toEqual([
      //   'CREATE',
      //   'GRANT',
      //   'READ',
      //   'UPDATE',
      //   'DELETE',
      //   'UPDATE_WHITEBOARD',
      //   'CREATE_COMMENT',
      // ]);
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Challenge / Collaboration / Callout / Comments', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.space.calloutId,
      //   TestUser.GLOBAL_HUBS_ADMIN
      // );
      // const data =
      //   response.data?.space.challenge.collaboration.callouts[0].posts[0]
      //     .authorization?.myPrivileges ?? [];
      // // Assert
      // expect(data).toEqual([
      //   'CREATE',
      //   'GRANT',
      //   'READ',
      //   'UPDATE',
      //   'DELETE',
      //   'UPDATE_WHITEBOARD',
      //   'CREATE_COMMENT',
      // ]);
    });
  });

  describe('Preferences', () => {
    test('GlobalSpaceAdmin privileges to Challenge / Preferences', async () => {
      // Act
      const response = await getChallengeDataCodegen(
        entitiesId.challenge.id,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data = response.data?.lookup.challenge?.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(
          sorted__create_read_update_delete_grant
        );
      });
    });
  });
});
