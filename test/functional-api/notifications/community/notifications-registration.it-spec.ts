import {
  createUserCodegen,
  deleteUserCodegen,
} from '@test/functional-api/user-management/user.request.params';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils';
import { users } from '@test/utils/queries/users-data';
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { UserPreferenceType } from '@alkemio/client-lib';
import { getMailsData } from '@test/functional-api/roles/community/communications-helper';

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
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUserCodegen(
      users.notificationsAdmin.id,
      UserPreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalAdmin.id,
      UserPreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalAdmin.id,
      UserPreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUserCodegen(
      users.globalSpacesAdmin.id,
      UserPreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
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

  test('User sign up - GA(1), SA(1), New User(1) get notifications', async () => {
    // Act
    const response = await createUserCodegen({
      email: userEmail,
      profileData: { displayName: userName },
    });
    userId = response?.data?.createUser.id ?? '';

    await delay(6000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [users.globalAdmin.email],
        }),

        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [users.globalSpacesAdmin.email],
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
      users.globalAdmin.id,
      UserPreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalSpacesAdmin.id,
      UserPreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUserCodegen(
      users.globalCommunityAdmin.id,
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
      users.globalAdmin.id,
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
          toAddresses: [users.globalAdmin.email],
        }),
      ])
    );
  });
});
