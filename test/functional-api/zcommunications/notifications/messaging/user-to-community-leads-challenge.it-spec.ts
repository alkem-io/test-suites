/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData, users } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOrgAndHubWithUsers,
} from '../../create-entities-with-users-helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  assignOrganizationAsCommunityLeadFunc,
  assignUserAsCommunityLeadFunc,
} from '@test/utils/mutations/assign-mutation';
import {
  deleteOrganization,
  updateOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { removeHub } from '@test/functional-api/integration/hub/hub.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import {
  removeOrganizationAsCommunityLeadFunc,
  removeUserAsCommunityLeadFunc,
} from '@test/utils/mutations/remove-mutation';
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;

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

  await updateOrganization(
    entitiesId.organizationId,
    organizationName,
    'legalEntityName',
    'domain',
    'https://website.org',
    'test-org@alkem.io'
  );

  await createChallengeWithUsers(challengeName);

  await assignUserAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    users.qaUserEmail
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    users.hubMemberEmail
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.hubAdminId,
      entitiesId.organizationId
    )
  );

  await assignOrganizationAsCommunityLeadFunc(
    entitiesId.challengeCommunityId,
    entitiesId.organizationId
  );
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeHub(entitiesId.hubId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - send messages to Private Hub, Public Challenge Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challengeCommunityId,
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
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('Hub member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challengeCommunityId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.hubAdminDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.hubAdminDisplayName),
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Hub, Private Challenge Community Leads', () => {
  beforeAll(async () => {
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
      'false'
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challengeCommunityId,
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
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonHubDisplayName),
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('Challenge member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challengeCommunityId,
      'Test message',
      TestUser.HUB_ADMIN
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.hubAdminDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.hubAdminDisplayName),
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.hubAdminEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Hub, Public Challenge NO Community Leads', () => {
  beforeAll(async () => {
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
      'true'
    );

    await removeUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.qaUserEmail
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      users.hubMemberEmail
    );

    await removeOrganizationAsCommunityLeadFunc(
      entitiesId.challengeCommunityId,
      entitiesId.organizationId
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challengeCommunityId,
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
          subject: senders(challengeName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });
});
