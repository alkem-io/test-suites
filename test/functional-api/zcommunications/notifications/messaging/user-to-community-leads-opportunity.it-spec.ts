/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
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
import { users } from '@test/utils/queries/users-data';

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
    'legalEntityName',
    'domain',
    'https://website.org',
    'test-org@alkem.io'
  );

  await createChallengeWithUsers(challengeName);
  await createOpportunityWithUsers(opportunityName);

  await removeUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.globalAdminEmail
  );
  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.opportunityMemberId
  );

  await assignUserAsCommunityLeadFunc(
    entitiesId.opportunityCommunityId,
    users.opportunityAdminId
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
describe('Notifications - send messages to Private Hub, Opportunity Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT hub member sends message to Opportunity community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
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
          subject: receivers(users.nonHubMemberDisplayName),
          toAddresses: [users.opportunityMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonHubMemberDisplayName),
          toAddresses: [users.opportunityAdminEmail],
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
      TestUser.OPPORTUNITY_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(users.opportunityMemberDisplayName),
          toAddresses: [users.opportunityMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.opportunityMemberDisplayName),
          toAddresses: [users.opportunityAdminEmail],
        }),
        expect.objectContaining({
          subject: senders(opportunityName),
          toAddresses: [users.opportunityMemberEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Hub, Public Challenge, Opportunity with NO Community Leads', () => {
  beforeAll(async () => {
    await removeUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityMemberEmail
    );
    await removeUserAsCommunityLeadFunc(
      entitiesId.opportunityCommunityId,
      users.opportunityAdminEmail
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
