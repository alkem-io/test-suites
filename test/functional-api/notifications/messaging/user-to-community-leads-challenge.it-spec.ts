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
import { users } from '@test/utils/queries/users-data';
import {
  createChallengeWithUsersCodegen,
  createOrgAndSpaceWithUsersCodegen,
} from '@test/utils/data-setup/entities';
import { ChallengePreferenceType } from '@alkemio/client-lib';
import { assignUserAsOrganizationAdminCodegen } from '@test/utils/mutations/authorization-mutation';
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

  await updateOrganizationCodegen(entitiesId.organizationId, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await updateSpaceSettingsCodegen(entitiesId.spaceId, {
    privacy: {
      mode: SpacePrivacyMode.Private,
    },
    // membership: {
    //   policy: CommunityMembershipPolicy.Open,
    // },
  });

  await createChallengeWithUsersCodegen(challengeName);

  await removeCommunityRoleFromUserCodegen(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.challengeMemberEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await assignCommunityRoleToUserCodegen(
    users.challengeAdminEmail,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );

  await assignUserAsOrganizationAdminCodegen(
    users.spaceAdminId,
    entitiesId.organizationId
  );

  await assignCommunityRoleToOrganizationCodegen(
    entitiesId.organizationId,
    entitiesId.challengeCommunityId,
    CommunityRole.Lead
  );
});

afterAll(async () => {
  await deleteSpaceCodegen(entitiesId.challengeId);
  await deleteSpaceCodegen(entitiesId.spaceId);
  await deleteOrganizationCodegen(entitiesId.organizationId);
});
describe('Notifications - send messages to Private Space, Public Challenge Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.challengeMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('Space member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
          subject: receivers(users.spaceAdminDisplayName),
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.spaceAdminDisplayName),
          toAddresses: [users.challengeMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.spaceAdminEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Private Challenge Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettingsCodegen(entitiesId.challengeId, {
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
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.nonSpaceMemberDisplayName),
          toAddresses: [users.challengeMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });

  test('Challenge member send message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
          subject: receivers(users.spaceAdminDisplayName),
          toAddresses: [users.challengeAdminEmail],
        }),
        expect.objectContaining({
          subject: receivers(users.spaceAdminDisplayName),
          toAddresses: [users.challengeMemberEmail],
        }),
        expect.objectContaining({
          subject: senders(challengeName),
          toAddresses: [users.spaceAdminEmail],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Public Challenge NO Community Leads', () => {
  beforeAll(async () => {
    // await changePreferenceChallengeCodegen(
    //   entitiesId.challengeId,
    //   ChallengePreferenceType.AllowNonMembersReadAccess,
    //   'true'
    // );
    await updateSpaceSettingsCodegen(entitiesId.challengeId, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
      // membership: {
      //   policy: CommunityMembershipPolicy.Open,
      // },
    });

    await removeCommunityRoleFromUserCodegen(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromUserCodegen(
      users.challengeMemberEmail,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );

    await removeCommunityRoleFromOrganizationCodegen(
      entitiesId.organizationId,
      entitiesId.challengeCommunityId,
      CommunityRole.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeadsCodegen(
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
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
});
