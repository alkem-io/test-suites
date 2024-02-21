/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { UserPreferenceType } from '@alkemio/client-lib';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { sendMessageToUserCodegen } from '@test/functional-api/communications/communication.params';
import { getMailsData } from '@test/functional-api/roles/community/communications-helper';

let receiver_userDisplayName = '';
let sender_userDisplayName = '';
let preferencesConfig: any[] = [];
let receiver = '';
let sender = '';

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent you a message!`;
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  receiver_userDisplayName = users.globalAdminDisplayName;
  sender_userDisplayName = users.nonSpaceMemberDisplayName;

  receiver = `${sender_userDisplayName} sent you a message!`;
  sender = `You have sent a message to ${receiver_userDisplayName}!`;

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
    {
      userID: users.nonSpaceMemberId,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
  ];
});

describe('Notifications - user to user messages', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUserCodegen(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test("User 'A'(pref:true) send message to user 'B'(pref:true) - 2 messages are sent", async () => {
    // Act
    await sendMessageToUserCodegen(
      [users.globalAdminId],
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  // Skipping until behavior is cleared, whather the bahavior of receiving email for each sent message is right
  test.skip("User 'A'(pref:true) send message to 2 users: 'B' and 'C'(pref:true) - 3 messages are sent", async () => {
    // Act
    await sendMessageToUserCodegen(
      [users.globalAdminId, users.qaUserId],
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  // Skipping until behavior is cleared, whather the bahavior of receiving email for each sent message is right
  test.skip("User 'A'(pref:true) send message to 2 users: 'B'(pref:true) and 'C'(pref:false) - 2 messages are sent", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.qaUserId,
      UserPreferenceType.NotificationCommunicationMessage,
      'false'
    );

    // Act
    await sendMessageToUserCodegen(
      [users.globalAdminId, users.qaUserId],
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
    await changePreferenceUserCodegen(
      users.qaUserId,
      UserPreferenceType.NotificationCommunicationMessage,
      'true'
    );
  });

  test("User 'A'(pref:true) send message to user 'B'(pref:false) - 1 messages are sent", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationCommunicationMessage,
      'false'
    );

    // Act
    await sendMessageToUserCodegen(
      [users.globalAdminId],
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test("User 'A'(pref:false) send message to user 'B'(pref:true) - 2 messages are sent", async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationCommunicationMessage,
      'true'
    );

    await changePreferenceUserCodegen(
      users.nonSpaceMemberId,
      UserPreferenceType.NotificationCommunicationMessage,
      'false'
    );

    // Act
    await sendMessageToUserCodegen(
      [users.globalAdminId],
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receiver,
          toAddresses: [users.globalAdminEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
});
