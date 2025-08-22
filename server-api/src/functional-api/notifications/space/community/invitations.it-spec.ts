/* eslint-disable @typescript-eslint/no-explicit-any */
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { TestUser } from '@alkemio/tests-lib';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

// Notification settings for invitation events
const invitationNotificationSettings = {
  notification: {
    space: {
      communityApplicationReceived: false,
      communityApplicationSubmitted: false,
      collaborationCalloutPublished: false,
      communicationUpdatesAdmin: false,
      communicationUpdates: false,
      communityInvitationUser: true,
      communityNewMember: false,
      communityNewMemberAdmin: false,
      collaborationPostCommentCreated: false,
      collaborationPostCreated: false,
      collaborationPostCreatedAdmin: false,
      collaborationWhiteboardCreated: false,
      communicationMessageAdmin: false,
      communicationMessage: false,
    },
  },
};

const disabledInvitationNotificationSettings = {
  notification: {
    space: {
      communityApplicationReceived: false,
      communityApplicationSubmitted: false,
      collaborationCalloutPublished: false,
      communicationUpdatesAdmin: false,
      communicationUpdates: false,
      communityInvitationUser: false,
      communityNewMember: false,
      communityNewMemberAdmin: false,
      collaborationPostCommentCreated: false,
      collaborationPostCreated: false,
      collaborationPostCreatedAdmin: false,
      collaborationWhiteboardCreated: false,
      communicationMessageAdmin: false,
      communicationMessage: false,
    },
  },
};

// Helper function to enable invitation notifications for specific users
const enableInvitationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, invitationNotificationSettings)
    )
  );
};

// Helper function to disable invitation notifications for specific users
const disableInvitationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledInvitationNotificationSettings)
    )
  );
};

// Helper function to create expected email objects
const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

// Helper function to send invitation and get emails
const sendInvitationAndGetEmails = async (
  roleSetId: string,
  userIds: string[],
  roles: RoleName[],
  sender: TestUser,
  delayMs = 2000
) => {
  const invitationData = await inviteForEntryRoleOnRoleSet(
    roleSetId,
    userIds,
    [],
    'welcome',
    roles,
    sender
  );

  let invitationId = 'invitationsInfoNotRetrieved';
  const invitationsResults = invitationData?.data?.inviteForEntryRoleOnRoleSet;
  if (invitationsResults && invitationsResults.length > 0) {
    const invitation = invitationsResults[0].invitation;
    if (invitation) {
      invitationId = invitation.id;
    }
  }

  await delay(delayMs);
  const emailsData = await getMailsData();

  return { invitationData, emailsData, invitationId };
};

let invitationId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-invitation',
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
      subspace: {
        collaboration: {
          addTutorialCallouts: false,
        },
        community: {
          admins: [TestUser.SUBSUBSPACE_ADMIN],
          members: [TestUser.SUBSUBSPACE_MEMBER, TestUser.SUBSUBSPACE_ADMIN],
        },
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await updateSpaceSettings(baseScenario.space.id, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });

  await updateSpaceSettings(baseScenario.subspace.id, {
    membership: {
      allowSubspaceAdminsToInviteMembers: true,
    },
  });

  // Enable invitation notifications for all relevant users
  const allRelevantUsers = [
    TestUserManager.users.spaceAdmin.id,
    TestUserManager.users.spaceMember.id,
    TestUserManager.users.subspaceAdmin.id,
    TestUserManager.users.subsubspaceAdmin.id,
    TestUserManager.users.nonSpaceMember.id,
    TestUserManager.users.qaUser.id,
  ];

  await enableInvitationNotifications(allRelevantUsers);
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - invitations', () => {
  beforeAll(async () => {
    // Disable notifications for global admins
    await disableInvitationNotifications([
      TestUserManager.users.globalSupportAdmin.id,
      TestUserManager.users.globalAdmin.id,
    ]);

    // Enable notifications for test users
    const testUsers = [
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.spaceMember.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.qaUser.id,
    ];
    await enableInvitationNotifications(testUsers);
  });

  afterEach(async () => {
    await deleteInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('non space user receive invitation for SPACE community from space admin', async () => {
    // Act & Assert
    const { emailsData, invitationId: currentInvitationId } =
      await sendInvitationAndGetEmails(
        baseScenario.space.community.roleSetId,
        [TestUserManager.users.nonSpaceMember.id],
        [RoleName.Member],
        TestUser.SPACE_ADMIN
      );

    invitationId = currentInvitationId;

    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          TestUserManager.users.nonSpaceMember.email
        ),
      ])
    );
  });

  test('non space user receive invitation for SPACE community from subspace admin', async () => {
    // Act & Assert
    const { emailsData, invitationId: currentInvitationId } =
      await sendInvitationAndGetEmails(
        baseScenario.space.community.roleSetId,
        [TestUserManager.users.qaUser.id],
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );

    invitationId = currentInvitationId;

    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          TestUserManager.users.qaUser.email
        ),
      ])
    );
  });

  test('non space user receive invitation for CHALLENGE community from subspace admin', async () => {
    // Act & Assert
    const { emailsData, invitationId: currentInvitationId } =
      await sendInvitationAndGetEmails(
        baseScenario.subspace.community.roleSetId,
        [TestUserManager.users.qaUser.id],
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );

    invitationId = currentInvitationId;

    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          TestUserManager.users.qaUser.email
        ),
      ])
    );
  });

  test("non space user don't receive invitation for CHALLENGE community from subsubspace admin", async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.SUBSUBSPACE_ADMIN
    );

    // Extract invitation ID if available
    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    await delay(1000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
    expect(invitationData.data?.inviteForEntryRoleOnRoleSet).toEqual([
      {
        type: 'INVITATION_TO_PARENT_NOT_AUTHORIZED',
        invitation: null,
        platformInvitation: null,
        __typename: 'RoleSetInvitationResult',
      },
    ]);
  });

  test('space member receive invitation for CHALLENGE community from subsubspace admin', async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.spaceMember.id],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.SUBSUBSPACE_ADMIN
    );
    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    await delay(1000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.spaceMember.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for OPPORTUNITY community from subsubspace admin', async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subsubspace.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.SUBSUBSPACE_ADMIN
    );
    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    await delay(1000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.subsubspace.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });
  test("non space user doesn't receive invitation for SPACE community from space admin", async () => {
    // Arrange
    await disableInvitationNotifications([
      TestUserManager.users.nonSpaceMember.id,
    ]);

    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.SPACE_ADMIN
    );
    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    await delay(1000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });

  test("non space user doesn't receive invitation for CHALLENGE community from subspace admin, flag disabled", async () => {
    // Arrange
    await updateSpaceSettings(baseScenario.subspace.id, {
      membership: {
        allowSubspaceAdminsToInviteMembers: false,
      },
    });

    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.qaUser.displayName],
      [],
      'welcome',
      [RoleName.Member],
      TestUser.SUBSPACE_ADMIN
    );
    const invitationsResults =
      invitationData?.data?.inviteForEntryRoleOnRoleSet;
    invitationId = 'invitationsInfoNotRetrieved';
    if (invitationsResults && invitationsResults.length > 0) {
      const invitation = invitationsResults[0].invitation;
      if (invitation) {
        invitationId = invitation.id;
      }
    }

    await delay(1000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
