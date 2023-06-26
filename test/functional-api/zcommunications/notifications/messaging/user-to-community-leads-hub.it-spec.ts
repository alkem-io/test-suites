/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
  changePreferenceSpace,
  SpacePreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { createOrgAndSpaceWithUsers } from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { assignUserAsCommunityLeadFunc } from '@test/utils/mutations/assign-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { removeUserAsCommunityLeadFunc } from '@test/utils/mutations/remove-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];

const senders = (communityName: string) => {
  return `You have sent a message to ${communityName} community!`;
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent a message to your community!`;
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndSpaceWithUsers(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );
  await removeUserAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    users.globalAdminEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    users.spaceAdminEmail
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.spaceCommunityId,
    users.spaceMemberEmail
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.spaceAdminId,
      entitiesId.organizationId
    )
  );

  preferencesConfig = [
    {
      userID: users.spaceAdminEmail,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
    {
      userID: users.spaceMemberEmail,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
  ];
});

afterAll(async () => {
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - send messages to Private space hosts', () => {
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
      await sendMessageToCommunityLeads(
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
        await changePreferenceUser(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
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
      await sendMessageToCommunityLeads(
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
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ANONYMOUS_READ_ACCESS,
      'true'
    );
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
      await sendMessageToCommunityLeads(
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
        await changePreferenceUser(config.userID, config.type, 'false');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
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
      await sendMessageToCommunityLeads(
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
    await changePreferenceSpace(
      entitiesId.spaceId,
      SpacePreferenceType.ANONYMOUS_READ_ACCESS,
      'true'
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.spaceAdminEmail
    );

    await removeUserAsCommunityLeadFunc(
      entitiesId.spaceCommunityId,
      users.spaceMemberEmail
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Space community (2 hosts) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
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

  test('Space member send message to Space community (2 hosts) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
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
