/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { TestUser } from '@test/utils';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteOrganizationCodegen,
  updateOrganizationCodegen,
} from '@test/functional-api/organization/organization.request.params';
import {
  deleteSpaceCodegen,
  updateSpaceSettingsCodegen,
} from '@test/functional-api/journey/space/space.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
import { sendMessageToCommunityLeadsCodegen } from '@test/functional-api/communications/communication.params';
import {
  entitiesId,
  getMailsData,
} from '@test/functional-api/roles/community/communications-helper';
import {
  removeRoleFromUser,
  assignRoleToUser,
  assignRoleToOrganization3,
  removeCommunityRoleFromOrganizationCodegen,
} from '@test/functional-api/roles/roles-request.params';
import {
  CommunityRole,
  SpacePrivacyMode,
} from '@test/generated/alkemio-schema';

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

  await createOrgAndSpaceWithUsersCodegen(
    organizationName,
    hostNameId,
    spaceName,
    spaceNameId
  );

  await updateOrganizationCodegen(entitiesId.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Private,
    },
  });

  await createChallengeWithUsersCodegen(challengeName);

  await removeRoleFromUser(
    users.globalAdmin.email,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.challengeMember.email,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );

  await assignRoleToUser(
    users.challengeAdmin.email,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceAdmin.id,
    entitiesId.organization.id
  );

  await assignRoleToOrganization3(
    entitiesId.organization.id,
    entitiesId.challenge.communityId,
    CommunityRoleType.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.challenge.id);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organization.id);
});
describe('Notifications - send messages to Private Space, Public Challenge Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  // ToDo: fix test
  test.skip('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
    await sendMessageToCommunityLeadsCodegen(
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
    await updateSpaceSettingsCodegen(entitiesId.challenge.id, {
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
    await sendMessageToCommunityLeadsCodegen(
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
    await sendMessageToCommunityLeadsCodegen(
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
    await updateSpaceSettingsCodegen(entitiesId.challenge.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });

    await removeRoleFromUser(
      users.challengeAdmin.email,
      entitiesId.challenge.communityId,
      CommunityRoleType.Lead
    );

    await removeRoleFromUser(
      users.challengeMember.email,
      entitiesId.challenge.communityId,
      CommunityRoleType.Lead
    );

    await removeCommunityRoleFromOrganizationCodegen(
      entitiesId.organization.id,
      entitiesId.challenge.communityId,
      CommunityRoleType.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
