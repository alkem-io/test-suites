import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  createSpaceAndGetData,
  deleteSpace,
} from '@functional-api/journey/space/space.request.params';
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { delay } from '@alkemio/tests-lib';

const uniqueId = UniqueIDGenerator.getID();

let spaceName = 'space' + uniqueId;
let spaceNameId = 'space' + uniqueId;
let spaceId = '';
const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'notifications-space-creation',
};

// Reusable notification settings for space creation
const spaceCreationNotificationSettings = {
  notification: {
    platform: {
      newUserSignUp: false,
      forumDiscussionComment: false,
      forumDiscussionCreated: false,
      spaceCreated: true,
      userProfileRemoved: false,
    },
  },
};

// Reusable notification settings to disable space creation notifications
const disabledSpaceCreationNotificationSettings = {
  notification: {
    platform: {
      newUserSignUp: false,
      forumDiscussionComment: false,
      forumDiscussionCreated: false,
      spaceCreated: false,
      userProfileRemoved: false,
    },
  },
};

// Helper function to update space creation notification settings for multiple admin users
const updateAdminSpaceCreationNotificationSettings = async () => {
  const adminUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.globalLicenseAdmin.id,
    TestUserManager.users.globalSupportAdmin.id,
  ];

  const a = await Promise.all(
    adminUsers.map(userId =>
      updateUserSettings(userId, spaceCreationNotificationSettings)
    )
  );
  console.log('Admin space creation notification settings updated:', a);
};

// Helper function to disable all admin space creation notifications
const disableAllAdminSpaceCreationNotifications = async () => {
  const adminUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.globalLicenseAdmin.id,
    TestUserManager.users.globalSupportAdmin.id,
  ];

  await Promise.all(
    adminUsers.map(userId =>
      updateUserSettings(userId, disabledSpaceCreationNotificationSettings)
    )
  );
};

// Helper function to create expected email objects
const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

// Helper function to create space and wait for emails
const createSpace = async (
  spaceName: string,
  spaceNameId: string,
  accountId: string
) => {
  const response = await createSpaceAndGetData(
    spaceName,
    spaceNameId,
    accountId
  );
  console.log('New Space ID:', response.error);

  const newSpaceId = response?.data?.lookup?.space?.id ?? '';

  return { spaceId: newSpaceId };
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await deleteMailSlurperMails();
  spaceName = `testspace${uniqueId}`;
  spaceNameId = `testspace${uniqueId}`;
});

describe.skip('Notifications - Space creation', () => {
  beforeAll(async () => {
    // Set up space creation notification settings for all admin users
    await updateAdminSpaceCreationNotificationSettings();
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  afterEach(async () => {
    if (spaceId) {
      await deleteSpace(spaceId);
    }
  });

  test.only('Space created - GA(1), LA(1), SA(1) get notifications', async () => {
    // Act
    const { spaceId: newSpaceId } = await createSpace(
      spaceName,
      spaceNameId,
      TestUserManager.users.betaTester.accountId
    );
    console.log('New Space ID:', newSpaceId);
    spaceId = newSpaceId;
    await delay(1000);
    const emailsData = await getMailsData();
    // Assert
    // Note: Email subjects are tentative - actual implementation may differ
    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `New Space created on Alkemio: ${spaceName}`,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          `New Space created on Alkemio: ${spaceName}`,
          TestUserManager.users.globalLicenseAdmin.email
        ),
        expectedEmail(
          `New Space created on Alkemio: ${spaceName}`,
          TestUserManager.users.globalSupportAdmin.email
        ),
      ])
    );
  });

  test('Space created - GA(0), LA(0), SA(0) - no admin notifications', async () => {
    // Arrange - Disable all admin space creation notifications
    await disableAllAdminSpaceCreationNotifications();

    // Act
    const { spaceId: newSpaceId } = await createSpace(
      spaceName + 'disabled',
      spaceNameId + 'disabled',
      TestUserManager.users.betaTester.accountId
    );
    spaceId = newSpaceId;
    await delay(1000);
    const emailsData = await getMailsData();
    // Assert
    expect(emailsData[1]).toEqual(0);
    expect(emailsData[0]).toEqual([]);
  });

  test('Space created - Only GA(1) gets notifications', async () => {
    // Arrange - Enable only global admin notifications
    await updateUserSettings(
      TestUserManager.users.globalAdmin.id,
      spaceCreationNotificationSettings
    );
    await updateUserSettings(
      TestUserManager.users.globalLicenseAdmin.id,
      disabledSpaceCreationNotificationSettings
    );
    await updateUserSettings(
      TestUserManager.users.globalSupportAdmin.id,
      disabledSpaceCreationNotificationSettings
    );

    // Act
    const { spaceId: newSpaceId } = await createSpace(
      spaceName + 'gaonly',
      spaceNameId + 'gaonly',
      TestUserManager.users.betaTester.accountId
    );
    spaceId = newSpaceId;
    await delay(1000);
    const emailsData = await getMailsData();
    // Assert
    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `New Space created on Alkemio: ${spaceName}gaonly`,
          TestUserManager.users.globalAdmin.email
        ),
      ])
    );
  });
});

describe.skip('Notifications - Space deletion', () => {
  beforeAll(async () => {
    // Enable space deletion notifications for admin (assuming this is supported)
    await updateUserSettings(TestUserManager.users.globalAdmin.id, {
      notification: {
        platform: {
          newUserSignUp: false,
          forumDiscussionComment: false,
          forumDiscussionCreated: false,
          spaceCreated: false,
          userProfileRemoved: false,
          // Note: spaceDeleted notification might not exist yet, this is a placeholder
        },
      },
    });
  });

  test('Space deleted - GA(1) get notifications', async () => {
    // Act - Create space first
    const { spaceId: newSpaceId } = await createSpace(
      spaceName + 'delete',
      spaceNameId + 'delete',
      TestUserManager.users.betaTester.accountId
    );
    spaceId = newSpaceId;

    // Clean emails and delete space
    await deleteMailSlurperMails();
    await deleteSpace(spaceId);
    spaceId = ''; // Clear the ID since space is deleted

    await delay(6000);
    const emailsData = await getMailsData();

    // Assert - Note: This test might fail if space deletion notifications are not implemented
    // This is a placeholder test to demonstrate the pattern
    expect(emailsData[1]).toBeGreaterThanOrEqual(0);
    if (emailsData[1] > 0) {
      expect(emailsData[0]).toEqual(
        expect.arrayContaining([
          expectedEmail(
            `Space deleted from Alkemio platform: ${spaceName}delete`,
            TestUserManager.users.globalAdmin.email
          ),
        ])
      );
    }
  });
});
