/* eslint-disable prettier/prettier */
import {
  UserPreferenceType,
  changePreferenceUser,
  changePreferenceHub,
  HubPreferenceType,
} from '@test/utils/mutations/preferences-mutation';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { createOrgAndHubWithUsers } from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import { assignUserAsCommunityLeadFunc } from '@test/utils/mutations/assign-mutation';
import { deleteOrganization } from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { removeUserAsCommunityLeadFunc } from '@test/utils/mutations/remove-mutation';
import { users } from '@test/utils/queries/users-data';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;

let preferencesConfig: any[] = [];

const senders = (communityName: string) => {
  return `You have sent a message to ${communityName} community!`;
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent a message to your community!`;
};

beforeAll(async () => {
  await deleteMailSlurperMails();

  await createOrgAndHubWithUsers(
    organizationName,
    hostNameId,
    hubName,
    hubNameId
  );
  await removeUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.globalAdminEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.hubAdminEmail
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.hubCommunityId,
    users.hubMemberEmail
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.hubAdminId,
      entitiesId.organizationId
    )
  );

  preferencesConfig = [
    {
      userID: users.hubAdminEmail,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
    {
      userID: users.hubMemberEmail,
      type: UserPreferenceType.COMMUNICATION_MESSAGE,
    },
  ];
});

afterAll(async () => {
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - send messages to Private hub hosts', () => {
  describe('Notifications - hosts (COMMUNICATION_MESSAGE pref: enabled)', () => {
    beforeAll(async () => {
      for (const config of preferencesConfig)
        await changePreferenceUser(config.userID, config.type, 'true');
    });

    beforeEach(async () => {
      await deleteMailSlurperMails();
    });

    test('NOT hub member sends message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.nonHubMemberEmail],
          }),
        ])
      );
    });

    test('Hub member send message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
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

    test('NOT hub member sends message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.nonHubMemberEmail],
          }),
        ])
      );
    });

    test('Hub member send message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });
});
describe('Notifications - messages to Public hub hosts', () => {
  beforeAll(async () => {
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ANONYMOUS_READ_ACCESS,
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

    test('NOT hub member sends message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.nonHubMemberEmail],
          }),
        ])
      );
    });

    test('Hub member send message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
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

    test('NOT hub member sends message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.nonHubMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.nonHubMemberEmail],
          }),
        ])
      );
    });

    test('Hub member send message to Hub community (2 hosts) - 3 messages sent', async () => {
      // Act
      await sendMessageToCommunityLeads(
        entitiesId.hubCommunityId,
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
            toAddresses: [users.hubAdminEmail],
          }),
          expect.objectContaining({
            subject: receivers(users.challengeMemberDisplayName),
            toAddresses: [users.hubMemberEmail],
          }),
          expect.objectContaining({
            subject: senders(hubName),
            toAddresses: [users.challengeMemberEmail],
          }),
        ])
      );
    });
  });
});

describe('Notifications - messages to Public hub NO hosts', () => {
  beforeAll(async () => {
    await changePreferenceHub(
      entitiesId.hubId,
      HubPreferenceType.ANONYMOUS_READ_ACCESS,
      'true'
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      users.hubAdminEmail
    );

    await removeUserAsCommunityLeadFunc(
      entitiesId.hubCommunityId,
      users.hubMemberEmail
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Hub community (2 hosts) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.hubCommunityId,
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
          subject: senders(hubName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('Hub member send message to Hub community (2 hosts) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.hubCommunityId,
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
          subject: await senders(hubName),
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });
});
