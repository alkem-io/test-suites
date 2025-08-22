/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { delay } from '@alkemio/tests-lib';
import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { TestUser } from '@alkemio/tests-lib';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const uniqueId = UniqueIDGenerator.getID();

// Helper functions for invitation notification settings
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

const enableInvitationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, invitationNotificationSettings)
    )
  );
};

const disableInvitationNotifications = async (userIds: string[]) => {
  await Promise.all(
    userIds.map(userId =>
      updateUserSettings(userId, disabledInvitationNotificationSettings)
    )
  );
};

const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({
    subject,
    toAddresses: [toAddress],
  });

const sendExternalInvitationAndGetEmails = async (
  roleSetId: string,
  externalEmails: string[],
  message: string,
  roles: RoleName[],
  sender: TestUser,
  delayMs = 1000
) => {
  const invitationData = await inviteForEntryRoleOnRoleSet(
    roleSetId,
    [],
    externalEmails,
    message,
    roles,
    sender
  );

  let invitationId = 'invitationsInfoNotRetrieved';
  const invitationResult = getSingleInvitationResult(invitationData);
  if (invitationResult && invitationResult.invitation) {
    invitationId = invitationResult.invitation.id;
  }

  await delay(delayMs);
  const emailsData = await getMailsData();

  return { invitationData, emailsData, invitationId };
};

let invitationId = '';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-external-invitation',
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
    // Disable notifications for global support admin
    await disableInvitationNotifications([
      TestUserManager.users.globalSupportAdmin.id,
    ]);

    // Enable notifications for test users
    const testUsers = [
      TestUserManager.users.spaceAdmin.id,
      TestUserManager.users.subspaceAdmin.id,
      TestUserManager.users.subsubspaceAdmin.id,
      TestUserManager.users.nonSpaceMember.id,
      TestUserManager.users.qaUser.id,
    ];
    await enableInvitationNotifications(testUsers);
  });

  afterEach(async () => {
    await deleteExternalInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('external user receive notifications', async () => {
    // Act & Assert
    const emailExternalUser = `external${uniqueId}@alkem.io`;
    const message = 'Hello, feel free to join our community!';

    const { emailsData, invitationId: currentInvitationId } =
      await sendExternalInvitationAndGetEmails(
        baseScenario.space.community.roleSetId,
        [emailExternalUser],
        message,
        [RoleName.Member],
        TestUser.GLOBAL_ADMIN
      );

    invitationId = currentInvitationId;

    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          emailExternalUser
        ),
      ])
    );
  });

  test('external user receive notifications from subspace', async () => {
    // Act & Assert
    const emailExternalUser = `external${uniqueId}@alkem.io`;
    const message = 'Hello, feel free to join our community!';

    const { emailsData, invitationId: currentInvitationId } =
      await sendExternalInvitationAndGetEmails(
        baseScenario.subspace.community.roleSetId,
        [emailExternalUser],
        message,
        [RoleName.Member],
        TestUser.SUBSPACE_ADMIN
      );

    invitationId = currentInvitationId;

    expect(emailsData[1]).toEqual(1);
    expect(emailsData[0]).toEqual(
      expect.arrayContaining([
        expectedEmail(
          `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          emailExternalUser
        ),
      ])
    );
  });
});
