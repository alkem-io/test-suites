import '../../utils/array.matcher';
import { getHubData, removeHub } from '../integration/hub/hub.request.params';
import { deleteOrganization } from '../integration/organization/organization.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  sendCommunityUpdate,
  sendCommunityUpdateVariablesData,
} from '@test/utils/mutations/update-mutation';
import { TestUser } from '@test/utils/token.helper';
import {
  assignUserAsCommunityMember,
  assignUserAsCommunityMemberVariablesData,
} from '@test/utils/mutations/assign-mutation';
import {
  removeUpdateCommunity,
  removeUpdateCommunityVariablesData,
} from '@test/utils/mutations/remove-mutation';
import {
  setHubVisibility,
  setHubVisibilityVariableData,
} from '@test/utils/mutations/authorization-mutation';
import { entitiesId } from './communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { createOrgAndHub } from './create-entities-with-users-helper';
import { users } from '@test/utils/queries/users-data';
const organizationName = 'upd-org-name' + uniqueId;
const hostNameId = 'upd-org-nameid' + uniqueId;
const hubName = 'upd-eco-name' + uniqueId;
const hubNameId = 'upd-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndHub(organizationName, hostNameId, hubName, hubNameId);
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'false'
      );

      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.hubCommunityId,
          users.hubMemberId
        )
      );

      const res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test'),
        TestUser.GLOBAL_ADMIN
      );
      entitiesId.messageId = res.body.data.sendMessageToRoom.id;
    });

    afterAll(async () => {
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );
    });
    test('community updates - PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const hubDataSender = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      const getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      const hubDataReaderMember = await getHubData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );

      const getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.updates
          .messages;

      const hubDataReader = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });

      expect(getMessageSender).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });

      expect(hubDataReader.text).toContain(
        `User (${users.nonHubMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE hub - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await changePreferenceHub(
        entitiesId.hubId,
        HubPreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );

      await mutation(
        setHubVisibility,
        setHubVisibilityVariableData(entitiesId.hubId, true)
      );

      // Act
      const hubDataSender = await getHubData(
        entitiesId.hubId,
        TestUser.GLOBAL_ADMIN
      );
      const getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      const hubDataReaderMember = await getHubData(
        entitiesId.hubId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        hubDataReaderMember.body.data.hub.community.communication.updates
          .messages;

      const hubDataReaderNotMemberIn = await getHubData(
        entitiesId.hubId,
        TestUser.NON_HUB_MEMBER
      );
      const hubDataReaderNotMember =
        hubDataReaderNotMemberIn.body.data.hub.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });

      expect(hubDataReaderNotMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      const res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test')
      );
      entitiesId.messageId = res.body.data.sendMessageToRoom.id;

      const hubDataSender = await getHubData(entitiesId.hubId);
      const getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      // Assert
      expect(getMessageSender).toHaveLength(1);
      expect(getMessageSender[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
      });

      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );
    });

    test('should delete community update', async () => {
      // Arrange
      const res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.hubUpdatesId, 'test')
      );

      entitiesId.messageId = res.body.data.sendMessageToRoom.id;

      // Act
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.hubUpdatesId,
          entitiesId.messageId
        )
      );

      const hubDataSender = await getHubData(entitiesId.hubId);
      const getMessageSender =
        hubDataSender.body.data.hub.community.communication.updates.messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
