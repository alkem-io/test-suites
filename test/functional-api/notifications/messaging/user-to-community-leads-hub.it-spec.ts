/* eslint-disable prettier/prettier */
import { changePreferenceUser } from '../../../utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '../../../utils/mailslurper.rest.requests';
import { delay } from '../../../utils/delay';
import { TestUser } from '../../../utils';
import { uniqueId } from '../../../utils/mutations/create-mutation';
import {
  deleteSpace,
  updateSpaceSettings,
} from '../../../functional-api/journey/space/space.request.params';
import { assignUserAsOrganizationAdmin } from '../../../utils/mutations/authorization-organization-mutation';
import { users } from '../../../utils/queries/users-data';
import { createOrgAndSpaceWithUsers } from '../../../utils/data-setup/entities';
import { UserPreferenceType } from '@alkemio/client-lib';
import { sendMessageToCommunityLeads } from '../../../functional-api/communications/communication.params';
import { entitiesId, getMailsData } from '../../../types/entities-helper';
import {
  removeRoleFromUser,
  assignRoleToUser,
} from '../../../functional-api/roleset/roles-request.params';
import {
  CommunityRoleType,
  SpacePrivacyMode,
} from '../../../generated/alkemio-schema';
import { deleteOrganization } from '../../../functional-api/contributor-management/organization/organization.request.params';

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

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await removeRoleFromUser(
    users.globalAdmin.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.spaceAdmin.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.spaceMember.id,
    entitiesId.space.roleSetId,
    CommunityRoleType.Lead
  );

  await assignUserAsOrganizationAdmin(
    users.spaceAdmin.id,
    entitiesId.organization.id
  );

  preferencesConfig = [
    {
      userID: users.spaceAdmin.email,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
    {
      userID: users.spaceMember.email,
      type: UserPreferenceType.NotificationCommunicationMessage,
    },
  ];
});

afterAll(async () => {
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});

describe('Notifications - send messages to Private space hosts', () => {
  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUser(config.userID, config.type, 'true');

      await updateSpaceSettings(entitiesId.spaceId, {
        privacy: {
          mode: SpacePrivacyMode.Private,
        },
      });
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMember.email],
          }),
        ])
      );
    });
  });

  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUser(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMember.email],
          }),
        ])
      );
    });
  });
});
describe('Notifications - messages to Public space hosts', () => {
  beforeAll(async () => {
    await updateSpaceSettings(entitiesId.spaceId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });
  });
  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUser(config.userID, config.type, 'true');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMember.email],
          }),
        ])
      );
    });
  });

  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: disabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUser(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.nonSpaceMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.nonSpaceMember.email],
          }),
        ])
      );
    });

    test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.space.communityId,
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
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceAdmin.email],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMember.displayName),
            toAddresses: [users.spaceMember.email],
          }),
          expect.objectContaining({
            subject: senders(spaceName),
            toAddresses: [users.challengeMember.email],
          }),
        ])
      );
    });
  });
});

describe('Notifications - messages to Public space NO hosts', () => {
  beforeAll(async () => {
    await updateSpaceSettings(entitiesId.spaceId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });

    await removeRoleFromUser(
      users.spaceAdmin.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );
    await removeRoleFromUser(
      users.spaceMember.id,
      entitiesId.space.roleSetId,
      CommunityRoleType.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Space community (0 hosts) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.space.communityId,
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
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Space member send message to Space community (0 hosts) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.space.communityId,
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
          toAddresses: [users.qaUser.email],
        }),
      ])
    );
  });
});
