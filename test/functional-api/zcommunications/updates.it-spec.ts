import '../../utils/array.matcher';
import {
  getSpaceData,
  removeSpace,
} from '../integration/space/space.request.params';
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
  setSpaceVisibility,
  setSpaceVisibilityVariableData,
} from '@test/utils/mutations/authorization-mutation';
import { entitiesId } from './communications-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { createOrgAndSpace } from './create-entities-with-users-helper';
import { users } from '@test/utils/queries/users-data';
const organizationName = 'upd-org-name' + uniqueId;
const hostNameId = 'upd-org-nameid' + uniqueId;
const spaceName = 'upd-eco-name' + uniqueId;
const spaceNameId = 'upd-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ANONYMOUS_READ_ACCESS,
        'false'
      );

      await mutation(
        assignUserAsCommunityMember,
        assignUserAsCommunityMemberVariablesData(
          entitiesId.spaceCommunityId,
          users.spaceMemberId
        )
      );

      const res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.spaceUpdatesId, 'test'),
        TestUser.GLOBAL_ADMIN
      );
      entitiesId.messageId = res.body.data.sendMessageToRoom.id;
    });

    afterAll(async () => {
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.spaceUpdatesId,
          entitiesId.messageId
        )
      );
    });
    test('community updates - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const spaceDataSender = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const getMessageSender =
        spaceDataSender.body.data.space.community.communication.updates
          .messages;

      const spaceDataReaderMember = await getSpaceData(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );

      const getMessageReaderMember =
        spaceDataReaderMember.body.data.space.community.communication.updates
          .messages;

      const spaceDataReader = await getSpaceData(
        entitiesId.spaceId,
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

      expect(spaceDataReader.text).toContain(
        `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await changePreferenceSpace(
        entitiesId.spaceId,
        SpacePreferenceType.ANONYMOUS_READ_ACCESS,
        'true'
      );

      await mutation(
        setSpaceVisibility,
        setSpaceVisibilityVariableData(entitiesId.spaceId, true)
      );

      // Act
      const spaceDataSender = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const getMessageSender =
        spaceDataSender.body.data.space.community.communication.updates
          .messages;

      const spaceDataReaderMember = await getSpaceData(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        spaceDataReaderMember.body.data.space.community.communication.updates
          .messages;

      const spaceDataReaderNotMemberIn = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const spaceDataReaderNotMember =
        spaceDataReaderNotMemberIn.body.data.space.community.communication
          .updates.messages;

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

      expect(spaceDataReaderNotMember[0]).toEqual({
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
        sendCommunityUpdateVariablesData(entitiesId.spaceUpdatesId, 'test')
      );
      entitiesId.messageId = res.body.data.sendMessageToRoom.id;

      const spaceDataSender = await getSpaceData(entitiesId.spaceId);
      const getMessageSender =
        spaceDataSender.body.data.space.community.communication.updates
          .messages;

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
          entitiesId.spaceUpdatesId,
          entitiesId.messageId
        )
      );
    });

    test('should delete community update', async () => {
      // Arrange
      const res = await mutation(
        sendCommunityUpdate,
        sendCommunityUpdateVariablesData(entitiesId.spaceUpdatesId, 'test')
      );

      entitiesId.messageId = res.body.data.sendMessageToRoom.id;

      // Act
      await mutation(
        removeUpdateCommunity,
        removeUpdateCommunityVariablesData(
          entitiesId.spaceUpdatesId,
          entitiesId.messageId
        )
      );

      const spaceDataSender = await getSpaceData(entitiesId.spaceId);
      const getMessageSender =
        spaceDataSender.body.data.space.community.communication.updates
          .messages;

      // Assert
      expect(getMessageSender).toHaveLength(0);
    });
  });
});
