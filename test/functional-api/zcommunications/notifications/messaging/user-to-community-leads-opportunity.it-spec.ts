/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteOrganization,
  updateOrganization,
} from '@test/functional-api/integration/organization/organization.request.params';
import { removeSpace } from '@test/functional-api/integration/space/space.request.params';
import { mutation } from '@test/utils/graphql.request';
import {
  assignUserAsOrganizationAdmin,
  userAsOrganizationOwnerVariablesData,
} from '@test/utils/mutations/authorization-mutation';
import { removeOpportunity } from '@test/functional-api/integration/opportunity/opportunity.request.params';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  RoleType,
  assignCommunityRoleToOrganization,
  assignCommunityRoleToUser,
  removeCommunityRoleFromOrganization,
  removeCommunityRoleFromUser,
} from '@test/functional-api/integration/community/community.request.params';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;
const opportunityName = `oppName${uniqueId}`;

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

  await updateOrganization(entitiesId.organizationId, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );

  await assignCommunityRoleToUser(
    users.opportunityMemberId,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );

  await assignCommunityRoleToUser(
    users.opportunityAdminId,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );

  await mutation(
    assignUserAsOrganizationAdmin,
    userAsOrganizationOwnerVariablesData(
      users.spaceAdminId,
      entitiesId.organizationId
    )
  );

  await assignCommunityRoleToOrganization(
    entitiesId.organizationId,
    entitiesId.opportunityCommunityId,
    RoleType.LEAD
  );
});

afterAll(async () => {
  await removeOpportunity(entitiesId.opportunityId);
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - send messages to Private Space, Opportunity Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Opportunity community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
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
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.opportunityMemberEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.opportunityAdminEmail],
        }),
        expect.objectContaining({
          subject: senders(opportunityName),
          toAddresses: [users.nonSpaceMemberEmail],
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

describe('Notifications - send messages to Private Space, Public Challenge, Opportunity with NO Community Leads', () => {
  beforeAll(async () => {
    await removeCommunityRoleFromUser(
      users.opportunityMemberEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromUser(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromOrganization(
      entitiesId.organizationId,
      entitiesId.opportunityCommunityId,
      RoleType.LEAD
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
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
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
});
