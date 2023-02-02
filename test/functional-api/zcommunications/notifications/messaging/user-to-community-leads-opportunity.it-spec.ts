/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData, users } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOpportunityWithUsers,
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
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const hubName = '111' + uniqueId;
const hubNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

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
  await createOpportunityWithUsers(opportunityName);

  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.qaUserEmail
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
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
    entitiesId.opportunityCommunityId,
    entitiesId.organizationId
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
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
      entitiesId.opportunityCommunityId,
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
          subject: senders(opportunityName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });

  test('Opportunity member send message to Opportunity community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.opportunityCommunityId,
      'Test message',
      TestUser.QA_USER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.qaUserDisplayName),
          toAddresses: [users.qaUserEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.qaUserDisplayName),
          toAddresses: [users.hubMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(opportunityName),
          toAddresses: [users.qaUserEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Hub, Public Challenge, Opportunity with NO Community Leads', () => {
  beforeAll(async () => {
    await removeUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.qaUserEmail
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.hubMemberEmail
    );

    await removeOrganizationAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      entitiesId.organizationId
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.opportunityCommunityId,
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
          subject: senders(opportunityName),
          toAddresses: [users.nonHubMemberEmail],
        }),
      ])
    );
  });
});
