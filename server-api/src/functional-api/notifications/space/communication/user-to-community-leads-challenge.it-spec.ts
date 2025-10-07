import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { sendMessageToCommunityLeads } from '@functional-api/communications/communication.params';
import {
  removeRoleFromUser,
  assignRoleToUser,
  assignRoleToOrganization,
  removeRoleFromOrganization,
} from '@functional-api/roleset/roles-request.params';
import { updateOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { notif } from '../../notification.helpers';

// Notification settings for communication message events
const communicationMessageNotificationSettings = {
  notification: {
    space: {
      admin: {
        communityApplicationReceived: notif(false),
        communityNewMember: notif(false),
        collaborationCalloutContributionCreated: notif(false),
        communicationMessageReceived: notif(true),
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
      messageReceived: notif(true),
      membership: {
        spaceCommunityInvitationReceived: notif(false),
        spaceCommunityJoined: notif(false),
      },
    },
  },
};

// Helper function to enable communication message notifications for specific users
const enableCommunicationMessageNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, communicationMessageNotificationSettings)
    )
  );
};

let usersList: string[] = [];

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent a message to your community`;
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'messaging-user-community-leads-subspace',
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
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Private,
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
        leads: [TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await updateOrganization(baseScenario.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceMember.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );

  usersList = [
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.subspaceMember.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.subspaceMember.id,
    TestUserManager.users.subsubspaceMember.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.qaUser.id,
  ];

  // Enable communication message notifications for community leads
  await enableCommunicationMessageNotifications(usersList);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
describe('Notifications - send messages to Private Space, Public Subspace Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
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
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
      ])
    );
  });

  test('Space member send message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.SUBSUBSPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(
            TestUserManager.users.subsubspaceMember.displayName
          ),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(
            TestUserManager.users.subsubspaceMember.displayName
          ),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Private Subspace Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(baseScenario.subspace.id, {
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
    });
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
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
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
      ])
    );
  });

  test('Subspace member send message to Subspace community (2 User Leads, 1 Org Lead) - 2 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.SUBSUBSPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(
            TestUserManager.users.subsubspaceMember.displayName
          ),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(
            TestUserManager.users.subsubspaceMember.displayName
          ),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Public Subspace NO Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(baseScenario.subspace.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });

    await removeRoleFromUser(
      TestUserManager.users.subspaceAdmin.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );

    await removeRoleFromUser(
      TestUserManager.users.subspaceMember.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );

    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 0 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(1000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
