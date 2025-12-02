import {
  getSpaceData,
  updateSpaceSettings,
} from '@functional-api/journey/space/space.request.params';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import { delay } from '@alkemio/tests-lib';
import {
  removeMessageOnRoom,
  sendMessageToRoom,
} from '../communication.params';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

let baseScenario: OrganizationWithSpaceModel;

// Helper function to clean up all messages in the updates room
async function cleanupAllMessages() {
  const spaceData = await getSpaceData(baseScenario.space.id);
  const messages =
    spaceData?.data?.lookup?.space?.community?.communication?.updates
      .messages ?? [];
  for (const message of messages) {
    await removeMessageOnRoom(
      baseScenario.space.communication.updatesId,
      message.id
    );
  }
}

const scenarioConfig: TestScenarioConfig = {
  name: 'community-updates',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Communities', () => {
  describe('Community updates - read access', () => {
    let messageId: string;

    beforeAll(async () => {
      // Clean up any existing messages first
      await cleanupAllMessages();

      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Private },
      });

      await assignRoleToUser(
        TestUserManager.users.spaceMember.id,
        baseScenario.space.community.roleSetId,
        RoleName.Member
      );

      const res = await sendMessageToRoom(
        baseScenario.space.communication.updatesId,
        'test'
      );
      messageId = res?.data?.sendMessageToRoom.id;
    });

    afterAll(async () => {
      await removeMessageOnRoom(
        baseScenario.space.communication.updatesId,
        messageId
      );
    });
    test('community updates - PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      // Act
      const spaceDataSender = await getSpaceData(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.lookup?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_MEMBER
      );

      const getMessageReaderMember =
        spaceDataReaderMember?.data?.lookup?.space?.community?.communication
          ?.updates.messages ?? [];
      await delay(100);
      const nonSpaceDataReader = await getSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0].id).toEqual(messageId);
      expect(retrievedMessage[0].message).toEqual('test');
      expect(retrievedMessage[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );

      expect(retrievedMessage).toHaveLength(1);
      expect(getMessageReaderMember[0].id).toEqual(messageId);
      expect(getMessageReaderMember[0].message).toEqual('test');
      expect(getMessageReaderMember[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );

      await delay(600);
      expect(nonSpaceDataReader.error?.errors[0].message).toContain(
        "Authorization: unable to grant 'read' privilege: authorize data loader result user"
      );
    });

    test('community updates - NOT PRIVATE space - read access - sender / reader (member) / reader (not member)', async () => {
      await updateSpaceSettings(baseScenario.space.id, {
        privacy: { mode: SpacePrivacyMode.Public },
      });

      // Act
      const spaceDataSender = await getSpaceData(
        baseScenario.space.id,
        TestUser.GLOBAL_ADMIN
      );
      const retrievedMessage =
        spaceDataSender?.data?.lookup?.space?.community?.communication?.updates
          .messages ?? [];

      const spaceDataReaderMember = await getSpaceData(
        baseScenario.space.id,
        TestUser.SPACE_MEMBER
      );
      const getMessageReaderMember =
        spaceDataReaderMember?.data?.lookup?.space?.community?.communication
          ?.updates.messages ?? [];

      const spaceDataReaderNotMemberIn = await getSpaceData(
        baseScenario.space.id,
        TestUser.NON_SPACE_MEMBER
      );
      const spaceDataReaderNotMember =
        spaceDataReaderNotMemberIn?.data?.lookup?.space?.community
          ?.communication?.updates.messages ?? [];

      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0].id).toEqual(messageId);
      expect(retrievedMessage[0].message).toEqual('test');
      expect(retrievedMessage[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );

      expect(getMessageReaderMember[0].id).toEqual(messageId);
      expect(getMessageReaderMember[0].message).toEqual('test');
      expect(getMessageReaderMember[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );

      expect(spaceDataReaderNotMember[0].id).toEqual(messageId);
      expect(spaceDataReaderNotMember[0].message).toEqual('test');
      expect(spaceDataReaderNotMember[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );
    });
  });

  describe('Community updates - create / delete', () => {
    let messageId: string;

    beforeEach(async () => {
      // Clean up any existing messages before each test
      await cleanupAllMessages();
    });

    test('should create community update', async () => {
      // Act
      const res = await sendMessageToRoom(
        baseScenario.space.communication.updatesId,
        'test'
      );
      messageId = res?.data?.sendMessageToRoom.id;

      const spaceDataSender = await getSpaceData(baseScenario.space.id);
      const retrievedMessage =
        spaceDataSender?.data?.lookup?.space?.community?.communication?.updates
          .messages ?? [];
      // Assert
      expect(retrievedMessage).toHaveLength(1);
      expect(retrievedMessage[0].id).toEqual(messageId);
      expect(retrievedMessage[0].message).toEqual('test');
      expect(retrievedMessage[0].sender?.id).toEqual(
        TestUserManager.users.globalAdmin.id
      );

      await removeMessageOnRoom(
        baseScenario.space.communication.updatesId,
        messageId
      );
    });

    test('should delete community update', async () => {
      // Arrange
      const res = await sendMessageToRoom(
        baseScenario.space.communication.updatesId,
        'test'
      );
      messageId = res?.data?.sendMessageToRoom.id;
      await delay(600);
      // Act
      await removeMessageOnRoom(
        baseScenario.space.communication.updatesId,
        messageId
      );

      await delay(600);

      const spaceDataSender = await getSpaceData(baseScenario.space.id);
      const retrievedMessage =
        spaceDataSender?.data?.lookup?.space?.community?.communication?.updates
          .messages;

      // Assert
      expect(retrievedMessage).toHaveLength(0);
    });
  });
});
