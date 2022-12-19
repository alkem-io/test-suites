import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';

import {
  UserPreferenceType,
  changePreferenceUser,
} from '@test/utils/mutations/preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { getMailsData, users } from '../communications-helper';
import { delay } from '@test/utils';

let userName = '';
let userId = '';
let userEmail = '';

beforeAll(async () => {
  await deleteMailSlurperMails();
  userName = `testuser${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;

  const requestUserData = await getUser(users.globalAdminIdEmail);
  users.globalAdminId = requestUserData.body.data.user.id;

  const reqNonEco = await getUser(users.nonHubMemberEmail);
  users.nonHubMemberId = reqNonEco.body.data.user.id;

  const notificationsAdmin = await getUser(users.notificationsAdminEmail);
  users.notificationsAdminId = notificationsAdmin.body.data.user.id;
});

describe('Notifications - User registration / removal', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.USER_SIGN_UP,
      'false'
    );
    await changePreferenceUser(
      users.notificationsAdminId,
      UserPreferenceType.USER_REMOVED,
      'false'
    );
    await changePreferenceUser(
      users.globalAdminId,
      UserPreferenceType.USER_SIGN_UP,
      'true'
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await removeUser(userId);
  });

  test('User sign up - GA(1), New User(1) get notifications', async () => {
    // Act
    const response = await createUserWithParams(userName, userEmail);
    userId = response.body.data.createUser.id;
    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[Alkemio] New user registration: ${userName}`,
          toAddresses: [users.globalAdminIdEmail],
        }),

        expect.objectContaining({
          subject: 'Alkemio - Registration successful!',
          toAddresses: [userEmail],
        }),
      ])
    );
  });

  test('User removed - GA(1) get notifications', async () => {
    // Act
    const response = await createUserWithParams(userName, userEmail);
    userId = response.body.data.createUser.id;
    await delay(6000);
    await deleteMailSlurperMails();
    await removeUser(userId);
    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `[Alkemio] User profile deleted: ${userName}`,
          toAddresses: [users.globalAdminIdEmail],
        }),
      ])
    );
  });

  test('User sign up - GA(0), New User(1) get notifications', async () => {
    // Arrange
    await changePreferenceUser(
      users.globalAdminId,
      UserPreferenceType.USER_SIGN_UP,
      'false'
    );

    // Act
    const response = await createUserWithParams(
      userName + 'only',
      'only' + userEmail
    );
    userId = response.body.data.createUser.id;
    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: 'Alkemio - Registration successful!',
          toAddresses: ['only' + userEmail],
        }),
      ])
    );
  });
});
