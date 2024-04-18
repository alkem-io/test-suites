/* eslint-disable prettier/prettier */
import { changePreferenceUserCodegen } from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { deleteOrganizationCodegen } from '@test/functional-api/organization/organization.request.params';
import { deleteSpaceCodegen, updateSpaceSettingsCodegen } from '@test/functional-api/journey/space/space.request.params';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import { createOrgAndSpaceWithUsersCodegen } from '@test/utils/data-setup/entities';
import { SpacePreferenceType, UserPreferenceType } from '@alkemio/client-lib';
import { sendMessageToCommunityLeadsCodegen } from '@test/functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import {
  removeCommunityRoleFromUserCodegen,
  assignCommunityRoleToUserCodegen,
} from '@test/functional-api/roles/roles-request.params';
import { CommunityRole, SpacePrivacyMode } from '@test/generated/alkemio-schema';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];

const senders = (communityName: string) => {
  return `You have sent a message to ${communityName} community`;
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent a message to your community`;
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.spaceAdminEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.spaceMemberEmail,
    entitiesId.spaceCommunityId,
    CommunityRole.Lead
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceAdminId,
    entitiesId.organizationId
  );

  preferencesConfig = [
    {
      userID: users.spaceAdminEmail,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
    {
      userID: users.spaceMemberEmail,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
  ];
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});

describe('Notifications - send messages to Private space hosts', () => {
  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUserCodegen(config.userID, config.type, 'true');

      await updateSpaceSettingsCodegen(entitiesId.spaceId, {
        privacy: {
          mode: SpacePrivacyMode.Private,
        },
        // membership: {
        //   policy: CommunityMembershipPolicy.Open,
        // },
      });
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.NON_HUB_MEMBER
      );

      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMemberEmail],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });

  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUserCodegen(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.NON_HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMemberEmail],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });
});
describe('Notifications - messages to Public space hosts', () => {
  beforeAll(async () => {
    // await changePreferenceSpaceCodegen(
    //   entitiesId.spaceId,
    //   SpacePreferenceType.AuthorizationAnonymousReadAccess,
    //   'true'
    // );

    await updateSpaceSettingsCodegen(entitiesId.spaceId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      // membership: {
      //   policy: CommunityMembershipPolicy.Open,
      // },
    });
  });
  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUserCodegen(config.userID, config.type, 'true');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.NON_HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMemberEmail],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });

  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUserCodegen(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.NON_HUB_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMemberEmail],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeadsCodegen(
        entitiesId.spaceCommunityId,
        'Test message',
        TestUser.CHALLENGE_MEMBER
      );
      await delay(3000);

      const getEmailsData = await getMailsData();

      // Assert
      expect(getEmailsData[1]).toEqual(3);
      expect(getEmailsData[0]).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.spaceMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });
});

describe('Notifications - messages to Public space NO hosts', () => {
  beforeAll(async () => {
    // await changePreferenceSpaceCodegen(
    //   entitiesId.spaceId,
    //   SpacePreferenceType.AuthorizationAnonymousReadAccess,
    //   'true'
    // );
    await updateSpaceSettingsCodegen(entitiesId.spaceId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      // membership: {
      //   policy: CommunityMembershipPolicy.Open,
      // },
    });

    await removeCommunityRoleFromUserCodegen(
      users.spaceAdminEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );
    await removeCommunityRoleFromUserCodegen(
      users.spaceMemberEmail,
      entitiesId.spaceCommunityId,
      CommunityRole.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Space community (0 hosts) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
      entitiesId.spaceCommunityId,
      'Test message',
      TestUser.NON_HUB_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: senders(spaceName),
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('Space member send message to Space community (0 hosts) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
      entitiesId.spaceCommunityId,
      'Test message',
      TestUser.QA_USER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: await senders(spaceName),
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });
});
