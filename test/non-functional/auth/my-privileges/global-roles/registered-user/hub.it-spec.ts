import {
  createPostOnCallout,
  getDataPerSpaceCallout,
} from '@test/functional-api/callout/post/post.request.params';
import {
  deleteSpace,
  getSpaceData,
} from '@test/functional-api/journey/space/space.request.params';
import { createRelation } from '@test/functional-api/relations/relations.request.params';
import { createApplication } from '@test/functional-api/roleset/application/application.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpace } from '@test/utils/mutations/preferences-mutation';

import {
  readPrivilege,
  sorted__read_applyToCommunity_joinCommunity,
  sorted__read_createRelation,
} from '../../common';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
import { SpacePreferenceType } from '@alkemio/client-lib';
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
    'true'
  );

  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.MembershipApplicationsFromAnyone,
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

describe('myPrivileges - Public Space', () => {
  test('RegisteredUser privileges to Space', async () => {
    // Act
    const response = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    const data = response.data?.space.authorization?.myPrivileges ?? [];

    // Assert
    expect(data.sort()).toEqual(readPrivilege);
  });

  describe('Community', () => {
    test('RegisteredUser privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.community?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_applyToCommunity_joinCommunity);
    });

    test('RegisteredUser privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.community?.applications?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.space.community?.communication?.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test.skip('RegisteredUser privileges to Space / Community / Communication / Discussion', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.space.community?.communication?.discussions?.[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Community / Communication / Updates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );

      const data =
        response.data?.space.community?.communication?.updates.authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__read_createRelation);
    });

    // Skip due to bug: https://app.zenspace.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('RegisteredUser privileges to Space / Collaboration / Relations', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.relations?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'CREATE_RELATION',
        'CREATE_CALLOUT',
      ]);
    });

    test('RegisteredUser privileges to Space / Collaboration / Callout', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Collaboration / Callout / Post', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Space / Collaboration / Callout / Whiteboard', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual([
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
    test.skip('RegisteredUser privileges to Space / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerSpaceCallout(
        entitiesId.spaceId,
        entitiesId.space.calloutId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.collaboration?.callouts?.[0].contributions?.filter(
          c => c.post !== null
        )[0].post?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual([
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
    test('RegisteredUser privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space..library?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space..library?.postTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space..library?.innovationFlowTemplates[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Space / Templates / Whiteboard', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space..library?.whiteboardTemplates[0]
          .authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space.preferences ?? [];

      // Assert
      data.map((item: any) => {
        expect(item.authorization.myPrivileges).toEqual(readPrivilege);
      });
    });
  });
});
