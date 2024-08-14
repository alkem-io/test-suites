import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { createRelationCodegen } from '@test/functional-api/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';

import {
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  readPrivilege,
  sorted__read_createRelation,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
} from '../../common';
import {
  assignUserAsGlobalCommunityAdmin,
  removeUserAsGlobalCommunityAdmin,
} from '@test/utils/mutations/authorization-mutation';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/roles/community/communications-helper';
import { SpacePreferenceType } from '@test/generated/alkemio-schema';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );

  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipApplicationsFromAnyone,
    'true'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromAnyone,
    'true'
  );
  await changePreferenceSpaceCodegen(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
    'true'
  );

  await createApplicationCodegen(
    entitiesId.space.communityId,
    TestUser.QA_USER
  );

  // await mutation(
  //   createDiscussion,
  //   createDiscussionVariablesData(
  //     entitiesId.space.communicationId,
  //     DiscussionCategory.GENERAL,
  //     'test'
  //   )
  // );

  await sendMessageToRoomCodegen(
    entitiesId.space.updateId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelationCodegen(
    entitiesId.space.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCalloutCodegen(
    entitiesId.space.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );

  await assignUserAsGlobalCommunityAdmin(users.spaceMember.id);
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
  await removeUserAsGlobalCommunityAdmin(users.spaceMember.id);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Space', async () => {
    // Act
    const response = await getSpaceDataCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data = response.data?.space?.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('GlobalCommunityAdmin privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space.community?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite
      );
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.community?.applications?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalCommunityAdmin privileges to Space / Community / Communication / Discussion', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space.community?.communication?.discussions?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Communication / Updates', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.community?.communication?.updates.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalCommunityAdmin privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.collaboration?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Relations', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.collaboration?.relations?.[0].authorization
          ?.myPrivileges ?? [];

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

    test('GlobalCommunityAdmin privileges to Space / Collaboration / Callout', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.collaboration?.callouts?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Whiteboard', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.space.calloutId,
      //   TestUser.GLOBAL_COMMUNITY_ADMIN
      // );
      // const data =
      //   response.body.data.space.collaboration.callouts[0].posts[0]
      //     .authorization.myPrivileges;
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
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Comments', async () => {
      // Act
      // const response = await getDataPerSpaceCalloutCodegen(
      //   entitiesId.spaceId,
      //   entitiesId.space.calloutId,
      //   TestUser.GLOBAL_COMMUNITY_ADMIN
      // );
      // const data =
      //   response.body.data.space.collaboration.callouts[0].posts[0]
      //     .authorization.myPrivileges;
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

  describe('Templates', () => {
    test('GlobalCommunityAdmin privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?..library?.authorization?.myPrivileges ??
        [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?..library?.postTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.data?.space?..library?.innovationFlowTemplates[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Space / Templates / Whiteboard', async () => {
      // Act
      // const response = await getSpaceDataCodegen(
      //   entitiesId.spaceId,
      //   TestUser.GLOBAL_COMMUNITY_ADMIN
      // );
      // const data =
      //   response.body.data.space.templates.whiteboardTemplates[0].authorization
      //     .myPrivileges;
      // // Assert
      // expect(data).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('GlobalCommunityAdmin privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data = response.data?.space.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(readPrivilege);
      });
    });
  });
});
