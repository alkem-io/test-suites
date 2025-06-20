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
import { updateUserSettingCommunicationMessage } from '@functional-api/contributor-management/user/user.request.params';

let receiver_userDisplayName = '';
let sender_userDisplayName = '';
let usersList: any[] = [];
let receiver = '';
let sender = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'user-to-user-messages',
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent you a message!`;
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await deleteMailSlurperMails();

  receiver_userDisplayName = TestUserManager.users.globalAdmin.displayName;
  sender_userDisplayName = TestUserManager.users.nonSpaceMember.displayName;

  receiver = `${sender_userDisplayName} sent you a message!`;
  sender = `You have sent a message to ${receiver_userDisplayName}!`;

  usersList = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.qaUser.id,
  ];
});

describe('Notifications - user to user messages', () => {
  beforeAll(async () => {
    for (const user of usersList)
      await updateUserSettingCommunicationMessage(user.userID, true);
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
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  // Skipping until behavior is cleared, whather the bahavior of receiving email for each sent message is right
  test.skip("User 'A'(pref:true) send message to 2 users: 'B' and 'C'(pref:true) - 3 messages are sent", async () => {
    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id, TestUserManager.users.qaUser.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
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
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  // Skipping until behavior is cleared, whather the bahavior of receiving email for each sent message is right
  test.skip("User 'A'(pref:true) send message to 2 users: 'B'(pref:true) and 'C'(pref:false) - 2 messages are sent", async () => {
    // Arrange
    await updateUserSettingCommunicationMessage(
      TestUserManager.users.qaUser.id,
      false
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id, TestUserManager.users.qaUser.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
    await updateUserSettingCommunicationMessage(
      TestUserManager.users.qaUser.id,
      true
    );
  });

  test("User 'A'(pref:true) send message to user 'B'(pref:false) - 1 messages are sent", async () => {
    // Arrange
    await updateUserSettingCommunicationMessage(
      TestUserManager.users.globalAdmin.id,
      false
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test("User 'A'(pref:false) send message to user 'B'(pref:true) - 2 messages are sent", async () => {
    // Arrange
    await updateUserSettingCommunicationMessage(
      TestUserManager.users.globalAdmin.id,
      true
    );

    await updateUserSettingCommunicationMessage(
      TestUserManager.users.nonSpaceMember.id,
      false
    );

    // Act
    await sendMessageToUser(
      [TestUserManager.users.globalAdmin.id],
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });
});
