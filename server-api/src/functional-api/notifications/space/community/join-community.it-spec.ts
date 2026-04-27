/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import {
  joinRoleSet,
  assignRoleToUser,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import {
  getUserData,
  updateUserSettings,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  CommunityMembershipPolicy,
  RoleName,
  SpacePrivacyMode,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { notif } from '../../notification.helpers';

// Notification settings for community join events
const communityJoinNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(true),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(false),
      },
      collaborationCalloutPublished: notif(false),
      communicationUpdates: notif(false),
      collaborationCalloutPostContributionComment: notif(false),
      collaborationCalloutContributionCreated: notif(false),
      collaborationCalloutComment: notif(false),
    },
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(true),
      },
    },
  },
};

const disabledCommunityJoinNotificationSettings = {
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
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(false),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

// Helper function to enable community join notifications for specific users
const enableCommunityJoinNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, communityJoinNotificationSettings)
    )
  );
};

// Helper function to disable community join notifications for specific users
const disableCommunityJoinNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledCommunityJoinNotificationSettings)
    )
  );
};

// Helper function to create expected email objects
const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

// Helper function to join community and get emails
const joinCommunityAndGetEmails = async (
  roleSetId: string,
  user: TestUser,
  delayMs = 1000
) => {
  await joinRoleSet(roleSetId, user);
  await delay(delayMs);
  return await getMailsData();
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-join-community',
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
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
      membership: {
        policy: CommunityMembershipPolicy.Open,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
      },
      settings: {
        membership: {
          policy: CommunityMembershipPolicy.Open,
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  // Enable community join notifications for all relevant users
  const allRelevantUsers = [
    TestUserManager.users.globalAdmin.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.spaceAdmin.id,
    TestUserManager.users.spaceMember.id,
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.qaUser.id,
  ];

  await enableCommunityJoinNotifications(allRelevantUsers);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** @testCase TC-0603 */
describe('Notifications - member join community', () => {
  beforeAll(async () => {
    // Disable notifications admin user notifications (if they exist)
    const notificationsUserId = await getUserData('notifications@alkem.io');
    const notificationsAdminUserId = notificationsUserId?.data?.user?.id ?? '';
    if (notificationsAdminUserId) {
      await updateUserSettings(
        notificationsAdminUserId,
        disabledCommunityJoinNotificationSettings
      );
    }
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('Non-space member join a Space - GA, HA and Joiner receive notifications', async () => {
    // Act
    const emailsData = await joinCommunityAndGetEmails(
      baseScenario.space.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );

    const subjectAdminSpaceNon = `user &#34;non space&#34; joined ${baseScenario.space.about.profile.displayName}`;

    // Assert
    expect(emailsData[1]).toEqual(3);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          subjectAdminSpaceNon,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          subjectAdminSpaceNon,
          TestUserManager.users.spaceAdmin.email
        ),
        expectedEmail(
          `${baseScenario.space.about.profile.displayName} - Welcome to the Community!`,
          TestUserManager.users.nonSpaceMember.email
        ),
      ])
    );
  });

  test('Non-space member join a Subspace - GA, HA, CA and Joiner receive notifications', async () => {
    // Act
    const emailsData = await joinCommunityAndGetEmails(
      baseScenario.subspace.community.roleSetId,
      TestUser.NON_SPACE_MEMBER
    );

    const subjectAdminSubspace = `user &#34;non space&#34; joined ${baseScenario.subspace.about.profile.displayName}`;

    // Assert
    expect(emailsData[1]).toEqual(3);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          subjectAdminSubspace,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          subjectAdminSubspace,
          TestUserManager.users.subspaceAdmin.email
        ),
        expectedEmail(
          `${baseScenario.subspace.about.profile.displayName} - Welcome to the Community!`,
          TestUserManager.users.nonSpaceMember.email
        ),
      ])
    );
  });

  test('Admin adds user to Space community - GA, HA and Joiner receive notifications', async () => {
    // Act
    await assignRoleToUser(
      TestUserManager.users.qaUser.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member,
      TestUser.GLOBAL_ADMIN
    );

    await delay(1000);
    const emailsData = await getMailsData();

    const subjectAdminSpace = `user &#34;qa user&#34; joined ${baseScenario.space.about.profile.displayName}`;

    // Assert
    expect(emailsData[1]).toEqual(3);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          subjectAdminSpace,
          TestUserManager.users.globalAdmin.email
        ),
        expectedEmail(
          subjectAdminSpace,
          TestUserManager.users.spaceAdmin.email
        ),
        expectedEmail(
          `${baseScenario.space.about.profile.displayName} - Welcome to the Community!`,
          TestUserManager.users.qaUser.email
        ),
      ])
    );
  });

  test('no notification when Non-space member cannot join a Space - GA, EA and Joiner', async () => {
    // Arrange - Disable notifications for all relevant users
    const allRelevantUsers = [
      TestUserManager.users.globalAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.qaUser.id,
    ];

    await disableCommunityJoinNotifications(allRelevantUsers);

    await removeRoleFromUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    );

    await removeRoleFromUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );

    // Act
    await joinRoleSet(baseScenario.space.community.roleSetId, TestUser.QA_USER);

    await delay(1000);
    const emailsData = await getMailsData();

    // Assert
    expect(emailsData[1]).toEqual(0);
  });
});
