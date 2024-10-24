/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '../../../utils/mailslurper.rest.requests';
import { delay } from '../../../utils/delay';
import { TestUser } from '../../../utils';
import { uniqueId } from '../../../utils/mutations/create-mutation';
import {
  deleteSpace,
  updateSpaceSettings,
} from '../../../functional-api/journey/space/space.request.params';
import { users } from '../../../utils/queries/users-data';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '../../../utils/data-setup/entities';
import { assignUserAsOrganizationAdmin } from '../../../utils/mutations/authorization-organization-mutation';
import { sendMessageToCommunityLeads } from '../../../functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '../../../types/entities-helper';
import {
  removeRoleFromUser,
  assignRoleToUser,
  assignRoleToOrganization,
  removeRoleFromOrganization,
} from '../../../functional-api/roleset/roles-request.params';
import {
  CommunityRoleType,
  SpacePrivacyMode,
} from '../../../generated/alkemio-schema';
import { deleteOrganization, updateOrganization } from '../../../functional-api/contributor-management/organization/organization.request.params';

const organizationName = 'urole-org-name' + uniqueId;
const hostNameId = 'urole-org-nameid' + uniqueId;
const spaceName = '111' + uniqueId;
const spaceNameId = '111' + uniqueId;
const challengeName = `chName${uniqueId}`;

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

  await updateOrganization(entitiesId.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await updateSpaceSettings(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Private,
    },
  });

  await createChallengeWithUsers(challengeName);

  await removeRoleFromUser(
    users.globalAdmin.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.challengeMember.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.challengeAdmin.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );

  await assignUserAsOrganizationAdmin(
    users.spaceAdmin.id,
    entitiesId.organization.id
  );

  await assignRoleToOrganization(
    entitiesId.organization.id,
    entitiesId.challenge.roleSetId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpace(entitiesId.challenge.id);
  await deleteSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organization.id);
});
describe('Notifications - send messages to Private Space, Public Challenge Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  // ToDo: fix test
  test.skip('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challenge.communityId,
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
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMember.displayName),
          toAddresses: [users.challengeMember.email],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Space member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challenge.communityId,
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
          subject: receivers(users.spaceAdmin.displayName),
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(users.spaceAdmin.displayName),
          toAddresses: [users.challengeMember.email],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.spaceAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Private Challenge Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(entitiesId.challenge.id, {
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
    });
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challenge.communityId,
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
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMember.displayName),
          toAddresses: [users.challengeMember.email],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Challenge member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challenge.communityId,
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
          subject: receivers(users.spaceAdmin.displayName),
          toAddresses: [users.challengeAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(users.spaceAdmin.displayName),
          toAddresses: [users.challengeMember.email],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.spaceAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Public Challenge NO Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(entitiesId.challenge.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });

    await removeRoleFromUser(
      users.challengeAdmin.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    await removeRoleFromUser(
      users.challengeMember.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );

    await removeRoleFromOrganization(
      entitiesId.organization.id,
      entitiesId.challenge.roleSetId,
      CommunityRoleType.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      entitiesId.challenge.communityId,
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
          toAddresses: [users.nonSpaceMember.email],
        }),
      ])
    );
  });
});
