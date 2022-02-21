import '../../utils/array.matcher';
import {
  createUserWithParams,
  getUser,
  removeUser,
} from '@test/functional-api/user-management/user.request.params';

import {
  PreferenceType,
  changePreference,
} from '@test/utils/mutations/user-preferences-mutation';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { delay, getMailsData, users } from './communications-helper';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';

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
});

describe('Notifications - registration', () => {
  beforeAll(async () => {
    await changePreference(
      users.globalAdminId,
      PreferenceType.USER_SIGN_UP,
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
    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New user registration: ${userName}`,
          toAddresses: [users.globalAdminIdEmail],
        }),

        expect.objectContaining({
          subject: `Alkemio registration successful!`,
          toAddresses: [userEmail],
        }),
      ])
    );
  });

  test('User sign up - GA(0), New User(1) get notifications', async () => {
    // Arrange
    await changePreference(
      users.globalAdminId,
      PreferenceType.USER_SIGN_UP,
      'false'
    );

    // Act
    const response = await createUserWithParams(
      userName + 'only',
      'only' + userEmail
    );
    userId = response.body.data.createUser.id;
    await delay(2000);
    let getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Alkemio registration successful!`,
          toAddresses: ['only' + userEmail],
        }),
      ])
    );
  });
});
