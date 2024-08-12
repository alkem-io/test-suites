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
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import {
  sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin,
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted_sorted__create_read_update_delete_grant_contribute_movePost,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
} from '../../common';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { SpacePreferenceType } from '@alkemio/client-lib';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
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
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('GlobalSpaceAdmin privileges to Space', async () => {
    // Act
    const response = await getSpaceDataCodegen(
      entitiesId.spaceId,
      TestUser.GLOBAL_HUBS_ADMIN
    );
    const data = response.data?.space.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin
    );
  });

  describe('Community', () => {
    test('GlobalSpaceAdmin privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.community?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite
      );
    });

    test('GlobalSpaceAdmin privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.community?.applications?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalSpaceAdmin privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalSpaceAdmin privileges to Space / Community / Communication / Discussion', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.community?.communication?.discussions?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalSpaceAdmin privileges to Space / Community / Communication / Updates', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.community?.communication?.updates?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalSpaceAdmin privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalSpaceAdmin privileges to Space / Collaboration / Relations', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.relations?.[0].authorization
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

    test('GlobalSpaceAdmin privileges to Space / Collaboration / Callout', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_contribute_movePost
      );
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

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
    test.skip('GlobalSpaceAdmin privileges to Space / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

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

  describe('Templates', () => {
    test('GlobalSpaceAdmin privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.account.library?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalSpaceAdmin privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.account.library?.postTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalSpaceAdmin privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.account.library?.innovationFlowTemplates[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    // ToDo
    test.skip('GlobalSpaceAdmin privileges to Space / Templates / Whiteboard', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data =
        response.data?.space.account.library?.whiteboardTemplates[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });
  });

  describe('Preferences', () => {
    test('GlobalSpaceAdmin privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_HUBS_ADMIN
      );
      const data = response.data?.space.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(
          sorted__create_read_update_delete_grant
        );
      });
    });
  });
});
