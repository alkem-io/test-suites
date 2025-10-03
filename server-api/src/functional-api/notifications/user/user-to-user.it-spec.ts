/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { sendMessageToUser } from '@functional-api/communications/communication.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { notif } from '../notification.helpers';

let sender_userDisplayName = '';
let usersList: any[] = [];
let receiver = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'user-to-user-messages',
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent you a message!`;
};

// Helper functions for communication message notification settings
const communicationMessageNotificationSettings = {
  privacy: {
    contributionRolesPubliclyVisible: true,
  },
  communication: {
    allowOtherUsersToSendMessages: true,
  },
  notification: {
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(true),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const disabledCommunicationMessageNotificationSettings = {
  privacy: {
    contributionRolesPubliclyVisible: false,
  },
  communication: {
    allowOtherUsersToSendMessages: false,
  },
  notification: {
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const enableCommunicationMessageNotifications = async (userId: string) => {
  await updateUserSettings(userId, communicationMessageNotificationSettings);
};

const disableCommunicationMessageNotifications = async (userId: string) => {
  await updateUserSettings(
    userId,
    disabledCommunicationMessageNotificationSettings
  );
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await deleteMailSlurperMails();

  sender_userDisplayName = TestUserManager.users.nonSpaceMember.displayName;

  receiver = `${sender_userDisplayName} sent you a message!`;

  usersList = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.qaUser.id,
  ];
});

describe('Notifications - user to user messages', () => {
  beforeAll(async () => {
    for (const user of usersList) {
      await enableCommunicationMessageNotifications(user);
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test("User 'A'(pref:true) send message to user 'B'(pref:true) - 2 messages are sent", async () => {
    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test("User 'A'(pref:true) send message to 2 users: 'B' and 'C'(pref:true) - 2 messages are sent", async () => {
    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id, TestUserManager.users.qaUser.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test("User 'A'(pref:true) send message to 2 users: 'B'(pref:true) and 'C'(pref:false) - 1 messages are sent", async () => {
    // Arrange
    await disableCommunicationMessageNotifications(
      TestUserManager.users.qaUser.id
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id, TestUserManager.users.qaUser.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
    await enableCommunicationMessageNotifications(
      TestUserManager.users.qaUser.id
    );
  });

  test("User 'A'(pref:true) send message to user 'B'(pref:false) - 1 messages are sent", async () => {
    // Arrange
    await disableCommunicationMessageNotifications(
      TestUserManager.users.globalAdmin.id
    );

    await enableCommunicationMessageNotifications(
      TestUserManager.users.nonSpaceMember.id
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test("User 'A'(pref:false) send message to user 'B'(pref:true) - 1 messages are sent", async () => {
    // Arrange
    await enableCommunicationMessageNotifications(
      TestUserManager.users.globalAdmin.id
    );

    await disableCommunicationMessageNotifications(
      TestUserManager.users.nonSpaceMember.id
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });
});
