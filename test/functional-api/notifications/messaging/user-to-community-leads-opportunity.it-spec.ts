/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteOrganizationCodegen,
  updateOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import { deleteSpaceCodegen, updateSpaceSettingsCodegen } from '@test/functional-api/journey/space/space.request.params';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOpportunityWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { sendMessageToCommunityLeadsCodegen } from '@test/functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import {
  removeCommunityRoleFromUserCodegen,
  assignCommunityRoleToUserCodegen,
  assignCommunityRoleToOrganizationCodegen,
  removeCommunityRoleFromOrganizationCodegen,
} from '@test/functional-api/roles/roles-request.params';
import { CommunityRole, SpacePrivacyMode } from '@test/generated/alkemio-schema';

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

  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Private,
    },
    // membership: {
    //   policy: CommunityMembershipPolicy.Open,
    // },
  });

  await updateOrganizationCodegen(entitiesId.organizationId, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await createChallengeWithUsersCodegen(challengeName);
  await createOpportunityWithUsersCodegen(opportunityName);

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.opportunityMemberId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.opportunityAdminId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceAdminId,
    entitiesId.organizationId
  );

  await assignCommunityRoleToOrganizationCodegen(
    entitiesId.organizationId,
    entitiesId.opportunityCommunityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.opportunityId);
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});
describe('Notifications - send messages to Private Space, Opportunity Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Opportunity community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
    await sendMessageToCommunityLeadsCodegen(
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
    await removeCommunityRoleFromUserCodegen(
      users.opportunityMemberEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.opportunityAdminEmail,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromOrganizationCodegen(
      entitiesId.organizationId,
      entitiesId.opportunityCommunityId,
      CommunityRole.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
