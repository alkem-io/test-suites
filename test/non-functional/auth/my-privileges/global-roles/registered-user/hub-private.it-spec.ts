import {
  PostTypes,
  createPostOnCallout,
} from '@test/functional-api/integration/post/post.request.params';
import {
  getSpaceData,
  removeSpace,
} from '@test/functional-api/integration/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { createRelation } from '@test/functional-api/integration/relations/relations.request.params';
import { createApplicationCodegen } from '@test/functional-api/user-management/application/application.request.params';
import { entitiesId } from '@test/functional-api/zcommunications/communications-helper';
import { createOrgAndSpace } from '@test/functional-api/zcommunications/create-entities-with-users-helper';
import { TestUser } from '@test/utils';
import { mutation } from '@test/utils/graphql.request';
import {
  createDiscussion,
  createDiscussionVariablesData,
  DiscussionCategory,
} from '@test/utils/mutations/communications-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { sorted__applyToCommunity_joinCommunity } from '../../common';

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

  await createApplicationCodegen(entitiesId.spaceCommunityId, TestUser.QA_USER);

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
});
afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('myPrivileges - Private Space', () => {
  test('RegisteredUser privileges to Space', async () => {
    // Act
    const response = await getSpaceData(
      entitiesId.spaceId,
      TestUser.NON_HUB_MEMBER
    );
    const data = response.body.data.space.authorization.myPrivileges;

    // Assert
    expect(data).toEqual([]);
  });

  describe('Community', () => {
    test('RegisteredUser privileges to Space / Community', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data =
        response.body.data.space.community.authorization.myPrivileges;

      // Assert
      expect(data.sort()).toEqual(sorted__applyToCommunity_joinCommunity);
    });

    test('RegisteredUser privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.space.community;

      // Assert
      expect(data.applications).toEqual(null);
    });

    test('RegisteredUser privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.space.community;

      // Assert
      expect(data.communication).toEqual(null);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.space;

      // Assert
      expect(data.collaboration).toEqual(null);
    });
  });

  describe('Templates', () => {
    test('RegisteredUser privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.space;

      // Assert
      expect(data.templates).toEqual(null);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.body.data.space;

      // Assert
      expect(data.preferences).toEqual(null);
    });
  });
});
