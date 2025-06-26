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
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { PreferenceType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

let invitationId = '';
let preferencesConfig: any[] = [];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-invitation',
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
      subspace: {
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

  preferencesConfig = [
    {
      userID: TestUserManager.users.spaceAdmin.id,
      type: PreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: TestUserManager.users.subspaceAdmin.id,
      type: PreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: TestUserManager.users.subsubspaceAdmin.id,
      type: PreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: TestUserManager.users.nonSpaceMember.id,
      type: PreferenceType.NotificationCommunityInvitationUser,
    },

    {
      userID: TestUserManager.users.qaUser.id,
      type: PreferenceType.NotificationCommunityInvitationUser,
    },
  ];
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Notifications - invitations', () => {
  beforeAll(async () => {
    await changePreferenceUser(
      TestUserManager.users.globalSupportAdmin.id,
      PreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    await changePreferenceUser(
      TestUserManager.users.globalAdmin.id,
      PreferenceType.NotificationCommunityInvitationUser,
      'false'
    );
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  afterEach(async () => {
    await deleteInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('non space user receive invitation for SPACE community from space admin', async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
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

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for SPACE community from subspace admin', async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome',
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

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
      ])
    );
  });

  test('non space user receive invitation for CHALLENGE community from subspace admin', async () => {
    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [TestUserManager.users.qaUser.id],
      [],
      'welcome',
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

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.qaUser.email],
        }),
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

    await delay(6000);

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

    await delay(6000);

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

    await delay(6000);

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
    await changePreferenceUser(
      TestUserManager.users.nonSpaceMember.id,
      PreferenceType.NotificationCommunityInvitationUser,
      'false'
    );

    // Act
    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
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

    await delay(6000);

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

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(0);
  });
});
