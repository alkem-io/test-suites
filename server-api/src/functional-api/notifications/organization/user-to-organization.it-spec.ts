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

// Helper functions for organization message notification settings
const organizationMessageNotificationSettings = {
  notification: {
    organization: {
      adminMentioned: false,
      adminMessageReceived: true,
    },
    user: {
      commentReply: false,
      mentioned: false,
      messageReceived: true,
      copyOfMessageSent: true,
      membership: {
        spaceCommunityApplicationSubmitted: false,
        spaceCommunityInvitationReceived: false,
        spaceCommunityJoined: false,
      },
    },
  },
};

const disabledOrganizationMessageNotificationSettings = {
  notification: {
    organization: {
      adminMentioned: false,
      adminMessageReceived: false,
    },
    user: {
      commentReply: false,
      mentioned: false,
      messageReceived: false,
      copyOfMessageSent: false,
      membership: {
        spaceCommunityApplicationSubmitted: false,
        spaceCommunityInvitationReceived: false,
        spaceCommunityJoined: false,
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
let sender = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'user-to-user-messages',
  space: {
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
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const a = await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
  console.log(a.error);

  const b = await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
  console.log(b.error);
  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );

  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );

  receivers = `${TestUserManager.users.nonSpaceMember.displayName} sent a message to your organization`;
  sender = `You have sent a message to ${baseScenario.organization.profile.displayName}!`;
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

  test("User 'A' sends message to Organization(both admins ORGANIZATION_MESSAGE:true) (3 admins) - 4 messages are sent", async () => {
    // Act
    await sendMessageToOrganization(
      baseScenario.organization.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:false) - 3 messages are sent", async () => {
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
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  // first admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:true
  // second admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false
  test("User 'A' sends message to Organization (3 admins, one admin has ORGANIZATION_MESSAGE:true and COMMUNICATION_MESSAGE:false) - 4 messages are sent", async () => {
    // Arrange - Enable organization message notifications but disable communication messages
    await updateUserSettings(TestUserManager.users.spaceAdmin.id, {
      notification: {
        organization: {
          adminMessageReceived: true,
          adminMentioned: false,
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
    expect(getEmailsData[1]).toEqual(4);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
        expect.objectContaining({
          subject: receivers,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
        expect.objectContaining({
          subject: sender,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });
});
