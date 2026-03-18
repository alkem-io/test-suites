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
import { sendMessageToOrganization } from '@functional-api/communications/communication.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { assignRoleToUser } from '@functional-api/roleset/roles-request.params';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { notif } from '../notification.helpers';

// Settings objects now match UpdateUserSettingsEntityInput expected shape
const organizationMessageNotificationSettings = {
  notification: {
    organization: {
      adminMentioned: notif(false),
      adminMessageReceived: notif(true),
    },
    user: {
      commentReply: notif(false),
      mentioned: notif(false),
      messageReceived: notif(true),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

const disabledOrganizationMessageNotificationSettings = {
  notification: {
    organization: {
      adminMentioned: notif(false),
      adminMessageReceived: notif(false),
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

const enableOrganizationMessageNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, organizationMessageNotificationSettings)
    )
  );
};

const disableOrganizationMessageNotifications = async (userId: string) => {
  await updateUserSettings(
    userId,
    disabledOrganizationMessageNotificationSettings
  );
};

let receivers = '';
//let sender = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'user-to-user-messages',
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );

  receivers = `${TestUserManager.users.nonSpaceMember.displayName} sent a message to your organization`;
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - user to organization messages', () => {
  beforeAll(async () => {
    // Enable organization message notifications for the organization admins
    await enableOrganizationMessageNotifications([
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
    ]);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test("User 'A' sends message to Organization(both admins ORGANIZATION_MESSAGE:true) (3 admins) - 3 messages are sent", async () => {
    // Act
    await sendMessageToOrganization(
      baseScenario.organization.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.organizationAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:false) - 2 messages are sent", async () => {
    // Arrange - Disable organization message notifications for one admin
    await disableOrganizationMessageNotifications(
      TestUserManager.users.spaceAdmin.id
    );

    // Act
    await sendMessageToOrganization(
      baseScenario.organization.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.organizationAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  // first admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:true
  // second admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false
  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false) - 3 messages are sent", async () => {
    // Arrange - Enable organization message notifications but disable communication messages
    await updateUserSettings(TestUserManager.users.spaceAdmin.id, {
      notification: {
        organization: {
          adminMessageReceived: notif(true),
          adminMentioned: notif(false),
        },
      },
      communication: {
        allowOtherUsersToSendMessages: false,
      },
    });

    // Act
    await sendMessageToOrganization(
      baseScenario.organization.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.organizationAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });
});
