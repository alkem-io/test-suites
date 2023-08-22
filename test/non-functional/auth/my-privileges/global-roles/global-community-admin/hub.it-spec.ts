import {
  PostTypes,
  createPostOnCallout,
  getDataPerSpaceCallout,
} from '@test/functional-api/integration/post/post.request.params';
import {
  getSpaceData,
  removeSpace,
} from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
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

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.APPLICATIONS_FROM_ANYONE,
    'true'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
    'true'
  );

  await createApplication(entitiesId.spaceCommunityId, TestUser.QA_USER);

  // await mutation(
  //   createDiscussion,
  //   createDiscussionVariablesData(
  //     entitiesId.spaceCommunicationId,
  //     DiscussionCategory.GENERAL,
  //     'test'
  //   )
  // );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.spaceUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.spaceCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCallout(
    entitiesId.spaceCalloutId,
    'postnameid',
    { profileData: { displayName: 'postDisplayName' } },
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );

  await assignUserAsGlobalCommunityAdmin(users.spaceMemberId);
});
afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalCommunityAdmin(users.spaceMemberId);
});

describe('myPrivileges', () => {
  test('GlobalCommunityAdmin privileges to Space', async () => {
    // Act
    const response = await getSpaceData(
      entitiesId.spaceId,
      TestUser.GLOBAL_COMMUNITY_ADMIN
    );
    const data = response.body.data.space.authorization.myPrivileges;

    // Assert
    expect(data.sort()).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('GlobalCommunityAdmin privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite
      );
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.community.applications[0].authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.community.communication.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalCommunityAdmin privileges to Space / Community / Communication / Discussion', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.community.communication.discussions[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalCommunityAdmin privileges to Space / Community / Communication / Updates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.community.communication.updates.authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalCommunityAdmin privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Relations', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.relations[0].authorization
          .myPrivileges;

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
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.callouts[0].authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.callouts[0].posts[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.callouts[0].posts[0]
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
    test.skip('GlobalCommunityAdmin privileges to Space / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.collaboration.callouts[0].posts[0]
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

  describe('Templates', () => {
    test('GlobalCommunityAdmin privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.templates.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.templates.postTemplates[0].authorization
          .myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('GlobalCommunityAdmin privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.templates.innovationFlowTemplates[0]
          .authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('GlobalCommunityAdmin privileges to Space / Templates / Whiteboard', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data =
        response.body.data.space.templates.whiteboardTemplates[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('GlobalCommunityAdmin privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_COMMUNITY_ADMIN
      );
      const data = response.body.data.space.preferences;

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges.sort()).toEqual(readPrivilege);
      });
    });
  });
});
