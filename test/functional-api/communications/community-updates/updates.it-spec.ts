import {
  getSpaceDataCodegen,
  deleteSpaceCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { TestUser } from '@test/utils/token.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { changePreferenceSpaceCodegen } from '@test/utils/mutations/preferences-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceCodegen } from '@test/utils/data-setup/entities';
import { CommunityRole, SpacePreferenceType } from '@alkemio/client-lib';
import {
  removeMessageOnRoomCodegen,
  sendMessageToRoomCodegen,
} from '../communication.params';
import { entitiesId } from '@test/functional-api/roles/community/communications-helper';
import { assignCommunityRoleToUserCodegen } from '@test/functional-api/roles/roles-request.params';
import { delay } from '@test/utils';
const organizationName = 'upd-org-name' + uniqueId;
const hostNameId = 'upd-org-nameid' + uniqueId;
const spaceName = 'upd-eco-name' + uniqueId;
const spaceNameId = 'upd-eco-nameid' + uniqueId;

beforeAll(async () => {
  await createOrgAndSpaceCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    beforeAll(async () => {
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'false'
      );

      await assignCommunityRoleToUserCodegen(
        users.spaceMemberId,
        entitiesId.spaceCommunityId,
        CommunityRole.Member
      );

      const res = await sendMessageToRoomCodegen(
        entitiesId.spaceUpdatesId,
        'test'
      );
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;
    });

    afterAll(async () => {
      await removeMessageOnRoomCodegen(
        entitiesId.spaceUpdatesId,
        entitiesId.messageId
      );
    });
    test('community updates - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const spaceDataSender = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );

      const getMessageReaderMember =
        spaceDataReaderMember?.data?.space?.community?.communication?.updates
          .messages ?? [];
      await delay(600);
      const spaceDataReader = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });

      expect(retrievedMessage).toHaveLength(1);
      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });

      await delay(600);
      expect(spaceDataReader.error?.errors[0].message).toContain(
        `User (${users.nonSpaceMemberEmail}) does not have credentials that grant 'read' access `
      );
    });

    test('community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Arrange
      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'true'
      );

      await changePreferenceSpaceCodegen(
        entitiesId.spaceId,
        SpacePreferenceType.AuthorizationAnonymousReadAccess,
        'true'
      );

      // Act
      const spaceDataSender = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.HUB_MEMBER
      );
      const getMessageReaderMember =
        spaceDataReaderMember?.data?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderNotMemberIn = await getSpaceDataCodegen(
        entitiesId.spaceId,
        TestUser.NON_HUB_MEMBER
      );
      const spaceDataReaderNotMember =
        spaceDataReaderNotMemberIn?.data?.space?.community?.communication
          ?.updates.messages ?? [];

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });

      expect(getMessageReaderMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });

      expect(spaceDataReaderNotMember[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });
    });
  });

  describe('Community updates - create / delete', () => {
    test('should create community update', async () => {
      // Act
      const res = await sendMessageToRoomCodegen(
        entitiesId.spaceUpdatesId,
        'test'
      );
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;

      const spaceDataSender = await getSpaceDataCodegen(entitiesId.spaceId);
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages ?? [];
      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0]).toEqual({
        id: entitiesId.messageId,
        message: 'test',
        sender: { id: users.globalAdminId },
        reactions: [],
        threadID: null,
      });

      await removeMessageOnRoomCodegen(
        entitiesId.spaceUpdatesId,
        entitiesId.messageId
      );
    });

    test('should delete community update', async () => {
      // Arrange
      const res = await sendMessageToRoomCodegen(
        entitiesId.spaceUpdatesId,
        'test'
      );
      entitiesId.messageId = res?.data?.sendMessageToRoom.id;
      await delay(600);
      // Act
      await removeMessageOnRoomCodegen(
        entitiesId.spaceUpdatesId,
        entitiesId.messageId
      );

      await delay(600);

      const spaceDataSender = await getSpaceDataCodegen(entitiesId.spaceId);
      const retrievedMessage =
        spaceDataSender?.data?.space?.community?.communication?.updates
          .messages;

      // Assert
      expect(retrievedMessage).toHaveLength(0);
    });
  });
});
