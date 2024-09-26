import {
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
} from '@test/functional-api/callout/post/post.request.params';
import {
  getSpaceData,
  deleteSpace,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createRelationCodegen } from '@test/functional-api/relations/relations.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToRoomCodegen } from '@test/functional-api/communications/communication.params';

import {
  sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin,
  sorted_sorted__create_read_update_delete_grant_createComment_Privilege,
  sorted__create_read_update_delete_grant_createDiscussion_Privilege,
  sorted_sorted__create_read_update_delete_grant_contribute_movePost,
  sorted__create_read_update_delete_grant_createRelation_createCallout_contribute,
  sorted__create_read_update_delete_grant,
  sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite,
  sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply,
  sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished,
} from '../../common';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import { SpacePreferenceType } from '@alkemio/client-lib/dist/types/alkemio-schema';
import { entitiesId } from '@test/types/entities-helper';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const spaceName = 'auth-ga-eco-name' + uniqueId;
const spaceNameId = 'auth-ga-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'false'
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.AuthorizationAnonymousReadAccess,
    'true'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromAnyone,
    'true'
  );
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipJoinSpaceFromHostOrganizationMembers,
    'true'
  );

  await createApplication(
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

  await sendMessageToRoom(
    entitiesId.space.updateId,
    'test',
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.space.collaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createPostOnCallout(
    entitiesId.space.calloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('myPrivileges', () => {
  test('GlobalAdmin privileges to Space', async () => {
    // Act
    const response = await getSpaceData(entitiesId.spaceId);
    const data = response.data?.space.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(
      sorted__create_read_update_delete_grant_authorizationReset_createSubspace_platformAdmin
    );
  });

  describe('Community', () => {
    test('GlobalAdmin privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data = response.data?.space.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_applyToCommunity_joinCommunity_addMember_Invite
      );
    });

    test('GlobalAdmin privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.community?.applications?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalAdmin privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createDiscussion_Privilege
      );
    });

    test.skip('GlobalAdmin privileges to Space / Community / Communication / Discussion', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.community?.communication?.discussions?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted_sorted__create_read_update_delete_grant_createComment_Privilege
      );
    });

    test('GlobalAdmin privileges to Space / Community / Communication / Updates', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.community?.communication?.updates.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createMessage_messageReaction_messageReply
      );
    });
  });

  describe('Collaboration', () => {
    test('GlobalAdmin privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.collaboration?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createRelation_createCallout_contribute
      );
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalAdmin privileges to Space / Collaboration / Relations', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.collaboration?.relations?.[0].authorization
          ?.myPrivileges;

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

    test('GlobalAdmin privileges to Space / Collaboration / Callout', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space.collaboration?.callouts?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(
        sorted__create_read_update_delete_grant_createPost_contribute_calloutPublished
      );
    });

    test('GlobalAdmin privileges to Space / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId
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
    test.skip('GlobalAdmin privileges to Space / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
        c => c.post !== null
      )[0].post?.authorization?.myPrivileges;

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
    test.skip('GlobalAdmin privileges to Space / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId
      );
      const data = response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
        c => c.post !== null
      )[0].post?.authorization?.myPrivileges;

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
    test('GlobalAdmin privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space..library?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalAdmin privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space..library?.postTemplates?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    test('GlobalAdmin privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space..library?.innovationFlowTemplates?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__create_read_update_delete_grant);
    });

    // ToDo
    test.skip('GlobalAdmin privileges to Space / Templates / Whiteboard', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
      const data =
        response.data?.space..library?.whiteboardTemplates?.[0]
          .authorization?.myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });
  });

  describe('Preferences', () => {
    test('GlobalAdmin privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceData(entitiesId.spaceId);
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
