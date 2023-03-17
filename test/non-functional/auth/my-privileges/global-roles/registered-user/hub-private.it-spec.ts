import {
  AspectTypes,
  createAspectOnCallout,
} from '@test/functional-api/integration/aspect/aspect.request.params';
import {
  getHubData,
  removeHub,
} from '@test/functional-api/integration/hub/hub.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplication } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndHub } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
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
import { sorted__applyToCommunity_joinCommunity } from '../../common';

const organizationName = 'auth-ga-org-name' + uniqueId;
const hostNameId = 'auth-ga-org-nameid' + uniqueId;
const hubName = 'auth-ga-eco-name' + uniqueId;
const hubNameId = 'auth-ga-eco-nameid' + uniqueId;

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
    'aspectnameid',
    { profileData: { displayName: 'aspectDisplayName' } },
    AspectTypes.KNOWLEDGE,
    TestUser.GLOBAL_ADMIN
  );
});
afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges - Private Hub', () => {
  test('RegisteredUser privileges to Hub', async () => {
    // Act
    const response = await getHubData(
      entitiesId.hubId,
      TestUser.NON_HUB_MEMBER
    );
    const data = response.body.data.hub.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  describe('Community', () => {
    test('RegisteredUser privileges to Hub / Community', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted__applyToCommunity_joinCommunity);
    });

    test('RegisteredUser privileges to Hub / Community / Application', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub.community;

      // Assert
      expect(data.applications).toEqual(null);
    });

    test('RegisteredUser privileges to Hub / Community / Communication', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub.community;

      // Assert
      expect(data.communication).toEqual(null);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Hub / Collaboration', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub;

      // Assert
      expect(data.collaboration).toEqual(null);
    });
  });

  describe('Templates', () => {
    test('RegisteredUser privileges to Hub / Templates', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub;

      // Assert
      expect(data.templates).toEqual(null);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Hub / Preferences', async () => {
      // Act
      const response = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.hub;

      // Assert
      expect(data.preferences).toEqual(null);
    });
  });
});
