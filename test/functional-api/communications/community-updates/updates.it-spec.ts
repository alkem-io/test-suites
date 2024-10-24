import {
  getSpaceData,
  deleteSpace,
  updateSpaceSettings,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganization } from '@test/functional-api/contributor-management/organization/organization.request.params';
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpace } from '@test/utils/data-setup/entities';
import { entitiesId } from '@test/types/entities-helper';
import { assignRoleToUser } from '@test/functional-api/roleset/roles-request.params';
import { delay } from '@test/utils';
import {
  CommunityRoleType,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';
import {
  removeMessageOnRoom,
  sendMessageToRoom,
} from '../communication.params';
const organizationName = 'upd-org-name' + uniqueId;
const hostNameId = 'upd-org-nameid' + uniqueId;
const spaceName = 'upd-eco-name' + uniqueId;
const spaceNameId = 'upd-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpace(organizationName, hostNameId, spaceName, spaceNameId);
});

afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await updateSpaceSettings(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Private },
      });

      await assignRoleToUser(
        users.spaceMember.id,
        entitiesId.space.roleSetId,
        CommunityRoleType.Member
      );

      const res = await sendMessageToRoom(entitiesId.space.updatesId, 'test');
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;
    });

    afterAll(async () => {
      await removeMessageOnRoom(
        entitiesId.space.updatesId,
        entitiesId.messageId
      );
    });
    test('community updates - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const spaceDataSender = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceData(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );

      const getMessageReaderMember =
        spaceDataReaderMember?.data?.space?.community?.communication?.updates
          .messages ?? [];
      await delay(600);
      const spaceDataReader = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });

      expect(retrievedMessage).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });

      await delay(600);
      expect(spaceDataReader.error?.errors[0].message).toContain(
        `User (${users.nonSpaceMember.email}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      await updateSpaceSettings(entitiesId.spaceId, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      // Act
      const spaceDataSender = await getSpaceData(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceData(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        spaceDataReaderMember?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderNotMemberIn = await getSpaceData(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      console.log(spaceDataReaderNotMemberIn.error);
      const spaceDataReaderNotMember =
        spaceDataReaderNotMemberIn?.data?.space?.community?.communication
          ?.updates.messages ?? [];

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });

      expect(spaceDataReaderNotMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      const res = await sendMessageToRoom(entitiesId.space.updatesId, 'test');
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;

      const spaceDataSender = await getSpaceData(entitiesId.spaceId);
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];
      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdmin.id },
        reactions: [],
        threadID: null,
      });

      await removeMessageOnRoom(
        entitiesId.space.updatesId,
        entitiesId.messageId
      );
    });

    test('should delete community update', async () => {
      // Arrange
      const res = await sendMessageToRoom(entitiesId.space.updatesId, 'test');
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;
      await delay(600);
      // Act
      await removeMessageOnRoom(
        entitiesId.space.updatesId,
        entitiesId.messageId
      );

      await delay(600);

      const spaceDataSender = await getSpaceData(entitiesId.spaceId);
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages;

      // Assert
      expect(retrievedMessage).toHaveLength(0);
    });
  });
});
