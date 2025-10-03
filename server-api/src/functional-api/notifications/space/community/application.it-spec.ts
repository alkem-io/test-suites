/* eslint-disable @typescript-eslint/no-explicit-any */

import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import {
  createApplication,
  deleteApplication,
} from '@functional-api/roleset/application/application.request.params';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import {
  getUserByNameId,
  updateUserSettings,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  CommunityMembershipPolicy,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { notif } from '../../notification.helpers';

// Notification settings for application events
const applicationNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(true),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
  },
};

const disabledApplicationNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
  },
};

// Helper function to enable application notifications for specific users
const enableApplicationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, applicationNotificationSettings)
    )
  );
};

// Helper function to disable application notifications for specific users
const disableApplicationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledApplicationNotificationSettings)
    )
  );
};

// Helper function to create expected email objects
const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

// Helper function to create application and get emails
const createApplicationAndGetEmails = async (
  roleSetId: string,
  delayMs = 1000
) => {
  const applicationData = await createApplication(roleSetId);
  await delay(delayMs);
  const emailsData = await getMailsData();

  return {
    applicationData,
    emailsData,
    applicationId: applicationData?.data?.applyForEntryRoleOnRoleSet?.id ?? '',
  };
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-application',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    },
    subspace: {
      collaboration: {
        addTutorialCallouts: false,
      },
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Enable application notifications for all relevant users
  const allRelevantUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.spaceAdmin.id,
    TestUserManager.users.spaceMember.id,
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.qaUser.id,
  ];

  await enableApplicationNotifications(allRelevantUsers);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - applications', () => {
  beforeAll(async () => {
    // Disable notifications for admin users (if they exist)
    const notificationsUserId = await getUserByNameId('notifications-admin');
    const notificationsAdminUserId =
      notificationsUserId.data?.lookupByName.user ?? '';
    if (notificationsAdminUserId) {
      await updateUserSettings(
        notificationsAdminUserId,
        disabledApplicationNotificationSettings
      );
    }

    // Disable global support admin notifications
    await updateUserSettings(
      TestUserManager.users.globalSupportAdmin.id,
      disabledApplicationNotificationSettings
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('receive notification for non space user application to space- GA, EA', async () => {
    // Act
    const { emailsData, applicationId } = await createApplicationAndGetEmails(
      baseScenario.space.community.roleSetId
    );

    baseScenario.space.community.applicationId = applicationId;

    // Assert
    expect(emailsData[1]).toEqual(2);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `${baseScenario.space.about.profile.displayName}: Application from qa`,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          `${baseScenario.space.about.profile.displayName}: Application from qa`,
          TestUserManager.users.spaceAdmin.email
        ),
      ])
    );
  });

  test('receive notification for non space user application to subspace- GA, CA', async () => {
    // Arrange
    await assignRoleToUser(
      TestUserManager.users.qaUser.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await deleteMailSlurperMails();

    await updateSpaceSettings(baseScenario.subspace.id, {
      membership: {
        policy: CommunityMembershipPolicy.Applications,
      },
    });

    // Act
    const { emailsData } = await createApplicationAndGetEmails(
      baseScenario.subspace.community.roleSetId
    );

    // Assert
    expect(emailsData[1]).toEqual(2);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `${baseScenario.subspace.about.profile.displayName}: Application from qa`,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          `${baseScenario.subspace.about.profile.displayName}: Application from qa`,
          TestUserManager.users.subspaceAdmin.email
        ),
      ])
    );
  });

  test('no notification for non space user application to space- GA, EA and Applicant', async () => {
    // Arrange - Disable notifications for all relevant users
    const allRelevantUsers = [
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.qaUser.id,
    ];

    await disableApplicationNotifications(allRelevantUsers);

    await deleteApplication(baseScenario.space.community.applicationId);

    // Act
    await createApplication(baseScenario.subspace.community.roleSetId);

    await delay(1500);
    const emailsData = await getMailsData();

    // Assert
    expect(emailsData[1]).toEqual(0);
  });
});
