/* eslint-disable @typescript-eslint/no-explicit-any */
import { UniqueIDGenerator } from '@alkemio/tests-lib';
import {
  deleteMailSlurperMails,
  getMailsData,
} from '@utils/mailslurper.rest.requests';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { delay } from '@alkemio/tests-lib';
import { TestUserManager } from '@src/scenario/TestUserManager';
import {
  deleteExternalInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { TestUser } from '@alkemio/tests-lib';
import { changePreferenceUser } from '@functional-api/contributor-management/user/user-preferences-mutation';
import { PreferenceType } from '@generated/graphql';
import { TestScenarioFactory } from '@src/scenario/TestScenarioFactory';
import { OrganizationWithSpaceModel } from '@src/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioConfig } from '@src/scenario/config/test-scenario-config';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';

const uniqueId = UniqueIDGenerator.getID();

let invitationId = '';
let preferencesConfig: any[] = [];

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'notifications-external-invitation',
  space: {
    collaboration: {
      addPostCallout: true,
      addPostCollectionCallout: true,
      addWhiteboardCallout: true,
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
        addPostCallout: true,
        addPostCollectionCallout: true,
        addWhiteboardCallout: true,
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
          addPostCallout: true,
          addPostCollectionCallout: true,
          addWhiteboardCallout: true,
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
    for (const config of preferencesConfig)
      await changePreferenceUser(config.userID, config.type, 'true');
  });

  afterEach(async () => {
    await deleteExternalInvitation(invitationId);
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('sender and external user receive notifications', async () => {
    // Act
    const emailExternalUser = `external${uniqueId}@alkem.io`;
    const message = 'Hello, feel free to join our community!';

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.space.community.roleSetId,
      [],
      [emailExternalUser],
      message,
      TestUser.GLOBAL_ADMIN
    );
    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.invitation) {
      invitationId = invitationResult.invitation.id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          toAddresses: [emailExternalUser],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.space.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.globalAdmin.email],
        }),
      ])
    );
  });

  test('subspace admin (sender) and external user receive notifications', async () => {
    // Act
    const emailExternalUser = `external${uniqueId}@alkem.io`;
    const message = 'Hello, feel free to join our community!';

    const invitationData = await inviteForEntryRoleOnRoleSet(
      baseScenario.subspace.community.roleSetId,
      [],
      [emailExternalUser],
      message,
      TestUser.SUBSPACE_ADMIN
    );

    const invitationResult = getSingleInvitationResult(invitationData);
    if (invitationResult && invitationResult.invitation) {
      invitationId = invitationResult.invitation.id;
    }

    await delay(6000);

    const getEmailsData = await getMailsData();
    // Assert
    expect(getEmailsData[1]).toEqual(2);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          toAddresses: [emailExternalUser],
        }),
      ])
    );
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: `Invitation to join ${baseScenario.subspace.about.profile.displayName}`,
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
      ])
    );
  });
});
