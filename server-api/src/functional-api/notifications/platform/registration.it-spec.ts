import {
  createUser,
  deleteUser,
  updateUserSettings,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';
import { notif } from '../notification.helpers';

const uniqueId = UniqueIDGenerator.getID();

let userName = '';
let userId = '';
let userEmail = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'notifications-user-registration',
};

// Reusable notification settings using NotificationSettingInput shape
const notificationSettings = {
  notification: {
    platform: {
      forumDiscussionComment: notif(false),
      forumDiscussionCreated: notif(false),
      admin: {
        userProfileCreated: notif(true),
        userProfileRemoved: notif(false),
        spaceCreated: notif(false),
        userGlobalRoleChanged: notif(false),
      },
    },
  },
};

// Helper function to update notification settings for multiple admin users
const updateAdminNotificationSettings = async () => {
  const adminUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.globalLicenseAdmin.id,
    TestUserManager.users.globalSupportAdmin.id,
  ];

  await Promise.all(
    adminUsers.map(userId => updateUserSettings(userId, notificationSettings))
  );
};

// Helper function to disable all admin notifications
const disableAllAdminNotifications = async () => {
  const disabledNotificationSettings = {
    notification: {
      platform: {
        forumDiscussionComment: notif(false),
        forumDiscussionCreated: notif(false),
        admin: {
          userProfileCreated: notif(false),
          userProfileRemoved: notif(false),
          spaceCreated: notif(false),
          userGlobalRoleChanged: notif(false),
        },
      },
    },
  };

  const adminUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.globalLicenseAdmin.id,
    TestUserManager.users.globalSupportAdmin.id,
  ];

  await Promise.all(
    adminUsers.map(userId =>
      updateUserSettings(userId, disabledNotificationSettings)
    )
  );
};

// Helper function to create expected email objects
const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

// Helper function to create user and wait for emails
const createUserAndGetEmails = async (
  email: string,
  displayName: string,
  delayMs = 1000
) => {
  const response = await createUser({
    email,
    profileData: { displayName },
  });
  const newUserId = response?.data?.createUser.id ?? '';

  await delay(delayMs);
  const emailsData = await getMailsData();

  return { userId: newUserId, emailsData };
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await deleteMailSlurperMails();
  userName = `testuser${uniqueId}`;
  userEmail = `${uniqueId}@test.com`;
});

/** @testCase TC-0602 */
describe('Notifications - User registration', () => {
  beforeAll(async () => {
    // Set up notification settings for all admin users
    await updateAdminNotificationSettings();
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    await deleteUser(userId);
  });

  test('User sign up - GA(1), SA(1), New User(1) get notifications', async () => {
    // Act
    const { userId: newUserId, emailsData } = await createUserAndGetEmails(
      userEmail,
      userName
    );
    userId = newUserId;

    // Assert
    expect(emailsData[1]).toEqual(3);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `New user registration on Alkemio: ${userName}`,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          `New user registration on Alkemio: ${userName}`,
          TestUserManager.users.globalSupportAdmin.email
        ),
        expectedEmail(
          `New user registration on Alkemio: ${userName}`,
          TestUserManager.users.globalLicenseAdmin.email
        ),
        //expectedEmail('Alkemio - Registration successful!', userEmail),
      ])
    );
  });
  test('User sign up - GA(0), New User(1) get notifications', async () => {
    // Arrange - Disable all admin notifications
    await disableAllAdminNotifications();

    // Act
    const { userId: newUserId, emailsData } = await createUserAndGetEmails(
      'only' + userEmail,
      userName + 'only',
      1000
    );
    userId = newUserId;

    // Assert
    expect(emailsData[1]).toEqual(0);
    // expect(emailsData[0]).toEqual(
    //   expect.arrayContaining([
    //     expectedEmail('Alkemio - Registration successful!', 'only' + userEmail),
    //   ])
    // );
  });
});

describe('Notifications - User removal', () => {
  beforeAll(async () => {
    // Enable user removal notifications for admin
    await updateUserSettings(TestUserManager.users.globalAdmin.id, {
      notification: {
        platform: {
          forumDiscussionComment: notif(false),
          forumDiscussionCreated: notif(false),
          admin: {
            userProfileCreated: notif(false),
            userProfileRemoved: notif(true),
            spaceCreated: notif(false),
            userGlobalRoleChanged: notif(false),
          },
        },
      },
    });
  });

  test('User removed - GA(1) get notifications', async () => {
    // Act - Create user first
    const { userId: newUserId } = await createUserAndGetEmails(
      userEmail,
      userName
    );
    userId = newUserId;

    // Clean emails and delete user
    await deleteMailSlurperMails();
    await deleteUser(userId);

    await delay(1000);
    const emailsData = await getMailsData();

    // Assert
    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `User profile deleted from the Alkemio platform: ${userName}`,
          TestUserManager.users.globalAdmin.email
        ),
      ])
    );
  });
});
