import {
  PostTypes,
  createPostOnCalloutCodegen,
  getDataPerSpaceCalloutCodegen,
} from '@test/functional-api/integration/post/post.request.params';
import {
  deleteSpaceCodegen,
  getSpaceDataCodegen,
} from '@test/functional-api/integration/space/space.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
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
  readPrivilege,
  sorted__read_applyToCommunity_joinCommunity,
  sorted__read_createRelation,
} from '../../common';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';

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
  await changePreferenceSpace(
    entitiesId.spaceId,
    SpacePreferenceType.ANONYMOUS_READ_ACCESS,
    'true'
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

  await createApplicationCodegen(entitiesId.spaceCommunityId, TestUser.QA_USER);

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

  await createPostOnCalloutCodegen(
    entitiesId.spaceCalloutId,
    { displayName: 'postDisplayName' },
    'postnameid',
    PostTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('myPrivileges - Public Space', () => {
  test('RegisteredUser privileges to Space', async () => {
    // Act
    const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getSpaceDataCodegen(
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
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
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
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
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
      const response = await getDataPerSpaceCalloutCodegen(
        entitiesId.spaceId,
        entitiesId.spaceCalloutId,
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
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.templates?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Templates / Post', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.templates?.postTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    test('RegisteredUser privileges to Space / Templates / Lifecycle', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.templates?.innovationFlowTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(readPrivilege);
    });

    // ToDo
    test.skip('RegisteredUser privileges to Space / Templates / Whiteboard', async () => {
      // Act
      const response = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.data?.space.templates?.whiteboardTemplates[0].authorization
          ?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(['READ']);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceDataCodegen(
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
