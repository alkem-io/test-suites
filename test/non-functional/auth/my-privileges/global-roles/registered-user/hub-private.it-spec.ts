import {
  createPostOnCallout,
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
import { sorted__applyToCommunity_joinCommunity } from '../../common';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { SpacePreferenceType } from '@alkemio/client-lib';
import { sendMessageToRoom } from '@test/functional-api/communications/communication.params';
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

describe('myPrivileges - Private Space', () => {
  test('RegisteredUser privileges to Space', async () => {
    // Act
    const response = await getSpaceData(
      entitiesId.spaceId,
      TestUser.QA_USER
    );
    const data = response.data?.space.authorization?.myPrivileges ?? [];

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
      console.log('response', response.data);

      console.log('response', response.data?.space);

      console.log('response', response.data?.space.community?.authorization);
      const data =
        response.data?.space.community?.authorization?.myPrivileges ?? [];

      // Assert
      expect(data.sort()).toEqual(sorted__applyToCommunity_joinCommunity);
    });

    test('RegisteredUser privileges to Space / Community / Application', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space.community;

      // Assert
      expect(data?.applications).toEqual(undefined);
    });

    test('RegisteredUser privileges to Space / Community / Communication', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space.community;

      // Assert
      expect(data?.communication).toEqual(undefined);
    });
  });

  describe('Collaboration', () => {
    test('RegisteredUser privileges to Space / Collaboration', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space;

      // Assert
      expect(data?.collaboration).toEqual(undefined);
    });
  });

  describe('Templates', () => {
    test('RegisteredUser privileges to Space / Templates', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space;

      // Assert
      expect(data?..library).toEqual(undefined);
    });
  });

  describe('Preferences', () => {
    test('RegisteredUser privileges to Space / Preferences', async () => {
      // Act
      const response = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const data = response.data?.space;

      // Assert
      expect(data?.preferences).toEqual(undefined);
    });
  });
});
