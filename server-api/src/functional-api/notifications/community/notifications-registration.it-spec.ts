import {
  createUser,
  deleteUser,
  getUserData,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { delay } from '@alkemio/tests-lib';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';

const uniqueId = UniqueIDGenerator.getID();

let userName = '';
let userId = '';
let userEmail = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'notifications-forum-discussion',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await deleteMailSlurperMails();
  userName = `testuser${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

describe('Notifications - User registration', () => {
  beforeAll(async () => {
    const notificationsUserId = await getUserData('notifications@alkem.io');
    const notificationsAdminUserId = notificationsUserId?.data?.user?.id ?? '';
    await changePreferenceUser(
      notificationsAdminUserId,
      PreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUser(
      notificationsAdminUserId,
      PreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalAdmin.id,
      PreferenceType.NotificationUserRemoved,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUser(
      TestUserManager.users.globalLicenseAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'true'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'true'
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteUser(userId);
  });

  test('User sign up - GA(1), SA(1), New User(1) get notifications', async () => {
    // Act
    const response = await createUser({
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
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),

        expect.objectContaining({
          subject: `New user registration on Alkemio: ${userName}`,
          toAddresses: [TestUserManager.users.globalSupportAdmin.email],
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
    await changePreferenceUser(
      TestUserManager.users.globalAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalLicenseAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationUserSignUp,
      'false'
    );

    // Act
    const response = await createUser({
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
    await changePreferenceUser(
      TestUserManager.users.globalAdmin.id,
      PreferenceType.NotificationUserRemoved,
      'true'
    );

    // Act
    const response = await createUser({
      email: userEmail,
      profileData: { displayName: userName },
    });
    userId = response?.data?.createUser.id ?? '';

    await delay(6000);
    await deleteMailSlurperMails();
    await deleteUser(userId);
    await delay(7000);
    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `User profile deleted from the Alkemio platform: ${userName}`,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });
});
