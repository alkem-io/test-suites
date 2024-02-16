import {
  createUserCodegen,
  deleteUserCodegen,
} from '@test/functional-api/user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { getMailsData } from '@test/functional-api/zcommunications/communications-helper';
import { delay } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { UserPreferenceType } from '@alkemio/client-lib';

let userName = '';
let userId = '';
let userEmail = '';

beforeAll(async () => {
  await deleteMailSlurperMails();
  userName = `testuser${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Notifications - User registration', () => {
  beforeAll(async () => {
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdminId,
      UserPreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUserCodegen(
      users.globalSpacesAdminId,
      UserPreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdminId,
      UserPreferenceType.NotificationUserSignUp,
      'true'
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteUserCodegen(userId);
  });

  test('User sign up - GA(1), GSA(1), GCA(1), New User(1) get notifications', async () => {
    // Act
    const response = await createUserCodegen({
      email: userEmail,
      profileData: { displayName: userName },
    });
    userId = response?.data?.createUser.id ?? '';

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [users.globalAdminEmail],
        }),

        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [users.globalSpacesAdminEmail],
        }),

        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [users.globalCommunityAdminEmail],
        }),

        expect.objectContaining({
          subject: 'Alkemio - Registration successful!',
          toAddresses: [userEmail],
        }),
      ])
    );
  });
  test('User sign up - GA(0), New User(1) get notifications', async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationUserSignUp,
      'false'
    );

    // Act
    const response = await createUserCodegen({
      email: 'only' + userEmail,
      profileData: { displayName: userName + 'only' },
    });
    userId = response?.data?.createUser.id ?? '';

    await delay(7000);
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
describe('Notifications - User removal', () => {
  test('User removed - GA(1) get notifications', async () => {
    // Arrange
    await changePreferenceUserCodegen(
      users.globalAdminId,
      UserPreferenceType.NotificationUserRemoved,
      'true'
    );

    // Act
    const response = await createUserCodegen({
      email: userEmail,
      profileData: { displayName: userName },
    });
    userId = response?.data?.createUser.id ?? '';

    await delay(6000);
    await deleteMailSlurperMails();
    await deleteUserCodegen(userId);
    await delay(7000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `User profile deleted from the Alkemio platform: ${userName}`,
          toAddresses: [users.globalAdminEmail],
        }),
      ])
    );
  });
});
