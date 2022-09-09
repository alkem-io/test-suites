import {
  AspectTypes,
  createAspectOnCallout,
  getDataPerHubCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  getHubData,
  removeHub,
} from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import {
  entitiesId,
  users,
} from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsGlobalHubsAdmin,
  removeUserAsGlobalHubsAdmin,
} from '@test/utils/mutations/authorization-mutation';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
} from '@test/utils/mutations/communications-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;
const cgrud = ['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE'];

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.ANONYMOUS_READ_ACCESS,
    'false'
  );

  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.APPLICATIONS_FROM_ANYONE,
    'true'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_ANYONE,
    'true'
  );
  await changePreferenceHub(
    entitiesId.hubId,
    HubPreferenceType.JOIN_HUB_FROM_HOST_ORGANIZATION_MEMBERS,
    'true'
  );

  await createApplication(entitiesId.hubCommunityId, TestUser.QA_USER);

  await mutation(
    createDiscussion,
    createDiscussionVariablesData(
      entitiesId.hubCommunicationId,
      DiscussionCategory.GENERAL,
      'test'
    )
  );

  await mutation(
    sendCommunityUpdate,
    sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test'),
    TestUser.GLOBAL_ADMIN
  );

  await createRelation(
    entitiesId.hubCollaborationId,
    'incoming',
    'relationDescription',
    'relationActorName',
    'relationActorRole',
    'relationActorType',
    TestUser.GLOBAL_ADMIN
  );

  await createAspectOnCallout(
    entitiesId.hubCalloutId,
    'aspectDisplayName',
    'aspectnameid',
    'aspectDescription',
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );

  await assignUserAsGlobalHubsAdmin(users.hubAdminId);
});
afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
  await removeUserAsGlobalHubsAdmin(users.hubAdminId);
});

describe('myPrivileges', () => {
  test('GlobalHubAdmin privileges to Hub', async () => {
    // Act
    const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
    const data = response.body.data.hub.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([
      'CREATE',
      'GRANT',
      'READ',
      'UPDATE',
      'DELETE',
      'AUTHORIZATION_RESET',
    ]);
  });

  describe('Community', () => {
    test('GlobalHubAdmin privileges to Hub / Community', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data = response.body.data.hub.community.authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'COMMUNITY_APPLY',
        'COMMUNITY_JOIN',
      ]);
    });

    test('GlobalHubAdmin privileges to Hub / Community / Application', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.community.applications[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    test('GlobalHubAdmin privileges to Hub / Community / Communication', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.community.communication.authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    test('GlobalHubAdmin privileges to Hub / Community / Communication / Discussion', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.community.communication.discussions[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    test('GlobalHubAdmin privileges to Hub / Community / Communication / Updates', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.community.communication.updates.authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });
  });

  describe('Collaboration', () => {
    test('GlobalHubAdmin privileges to Hub / Collaboration', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.collaboration.authorization.myPrivileges;

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

    // Skip due to bug: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/alkem-io/server/2143
    test.skip('GlobalHubAdmin privileges to Hub / Collaboration / Relations', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.collaboration.relations[0].authorization
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

    test('GlobalHubAdmin privileges to Hub / Collaboration / Callout', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.collaboration.callouts[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'CREATE_ASPECT',
        'CREATE_CANVAS',
        'CREATE_COMMENT',
        'UPDATE_CANVAS',
      ]);
    });

    test('GlobalHubAdmin privileges to Hub / Collaboration / Callout / Aspect', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    // ToDo
    test.skip('GlobalHubAdmin privileges to Hub / Collaboration / Callout / Canvas', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_CANVAS',
        'CREATE_COMMENT',
      ]);
    });

    // ToDo
    test.skip('GlobalHubAdmin privileges to Hub / Collaboration / Callout / Comments', async () => {
      // Act
      const response = await getDataPerHubCallout(
        entitiesId.hubId,
        entitiesId.hubCalloutId,
        TestUser.HUB_ADMIN
      );
      const data =
        response.body.data.hub.collaboration.callouts[0].aspects[0]
          .authorization.myPrivileges;

      // Assert
      expect(data).toEqual([
        'CREATE',
        'GRANT',
        'READ',
        'UPDATE',
        'DELETE',
        'UPDATE_CANVAS',
        'CREATE_COMMENT',
      ]);
    });
  });

  describe('Templates', () => {
    test('GlobalHubAdmin privileges to Hub / Templates', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data = response.body.data.hub.templates.authorization.myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    test('GlobalHubAdmin privileges to Hub / Templates / Aspect', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.templates.aspectTemplates[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    test('GlobalHubAdmin privileges to Hub / Templates / Lifecycle', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.templates.lifecycleTemplates[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });

    // ToDo
    test.skip('GlobalHubAdmin privileges to Hub / Templates / Lifecycle', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data =
        response.body.data.hub.templates.canvasTemplates[0].authorization
          .myPrivileges;

      // Assert
      expect(data).toEqual(['CREATE', 'GRANT', 'READ', 'UPDATE', 'DELETE']);
    });
  });

  describe('Preferences', () => {
    test('GlobalHubAdmin privileges to Hub / Preferences', async () => {
      // Act
      const response = await getHubData(entitiesId.hubId, TestUser.HUB_ADMIN);
      const data = response.body.data.hub;

      // Assert
      expect(data.preferences[0].authorization.myPrivileges).toEqual(cgrud);
      expect(data.preferences[1].authorization.myPrivileges).toEqual(cgrud);
      expect(data.preferences[2].authorization.myPrivileges).toEqual(cgrud);
      expect(data.preferences[3].authorization.myPrivileges).toEqual(cgrud);
    });
  });
});
