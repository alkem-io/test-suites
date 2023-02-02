/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

import { delay } from '@test/utils/delay';
import { getUser } from '@test/functional-api/user-management/user.request.params';
import { getMailsData, users } from '../../communications-helper';
import { sendMessageToUser } from '../../communications.request.params';
import { TestUser } from '@test/utils';
let receiver_userDisplayName = '';
//let receiver2_userDisplayName = '';

let sender_userDisplayName = '';
let preferencesConfig: any[] = [];
let receiver = '';
let sender = '';

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent you a message!`;
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;
  receiver_userDisplayName = requestUserData.body.data.user.displayName;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;
  sender_userDisplayName = reqNonEco.body.data.user.displayName;

  const reqQaUser = await getUser(users.qaUserEmail);
  users.qaUserId = reqQaUser.body.data.user.id;
  //receiver2_userDisplayName = reqQaUser.body.data.user.displayName;

  receiver = `${sender_userDisplayName} sent you a message!`;
  sender = `You have sent a message to ${receiver_userDisplayName}!`;

  preferencesConfig = [
    {
      userID: users.globalAdminId,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
    {
      userID: users.nonHubMemberId,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
    {
      userID: users.qaUserId,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
  ];
});

describe('Notifications - user to user messages', () => {
  beforeAll(async () => {
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('User \'A\'(pref:true) send message to user \'B\'(pref:true) - 2 messages are sent', async () => {
    // Act
    await sendMessageToUser(
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
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test.only('User \'A\'(pref:true) send message to 2 users: \'B\' and \'C\'(pref:true) - 3 messages are sent', async () => {
    // Act
    await sendMessageToUser(
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
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('User \'A\'(pref:true) send message to 2 users: \'B\'(pref:true) and \'C\'(pref:false) - 2 messages are sent', async () => {
    // Act
    await sendMessageToUser(
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
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('User \'A\'(pref:true) send message to user \'B\'(pref:false) - 1 messages are sent', async () => {
    // Arrange
    await changePreferenceUser(
      users.globalAdminId,
      UserPreferenceType.COMMUNICATION_MESSAGE,
      'false'
    );

    // Act
    await sendMessageToUser(
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
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('User \'A\'(pref:false) send message to user \'B\'(pref:true) - 2 messages are sent', async () => {
    // Arrange
    await changePreferenceUser(
      users.globalAdminId,
      UserPreferenceType.COMMUNICATION_MESSAGE,
      'true'
    );

    await changePreferenceUser(
      users.nonHubMemberId,
      UserPreferenceType.COMMUNICATION_MESSAGE,
      'false'
    );

    // Act
    await sendMessageToUser(
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
          toAddresses: [users.globalAdminIdEmail],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });
});
