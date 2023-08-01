/* eslint-disable prettier/prettier */
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { delay } from '@test/utils/delay';
import { entitiesId, getMailsData } from '../../communications-helper';
import { sendMessageToCommunityLeads } from '../../communications.request.params';
import { TestUser } from '@test/utils';
import {
  createChallengeWithUsers,
  createOrgAndSpaceWithUsers,
} from '../../create-entities-with-users-helper';
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
import {
  ChallengePreferenceType,
  changePreferenceChallenge,
} from '@test/utils/mutations/preferences-mutation';
import { removeChallenge } from '@test/functional-api/integration/challenge/challenge.request.params';
import { users } from '@test/utils/queries/users-data';
import {
  assignCommunityRoleToOrganization,
  assignCommunityRoleToUser,
  removeCommunityRoleFromOrganization,
  removeCommunityRoleFromUser,
  RoleType,
} from '@test/functional-api/integration/community/community.request.params';

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

  await updateOrganization(
    entitiesId.organizationId,
    'legalEntityName',
    'domain',
    'https://website.org',
    'test-org@alkem.io'
  );

  await createChallengeWithUsers(challengeName);

  await removeCommunityRoleFromUser(
    users.globalAdminEmail,
    entitiesId.challengeCommunityId,
    RoleType.LEAD
  );

  await assignCommunityRoleToUser(
    users.challengeMemberEmail,
    entitiesId.challengeCommunityId,
    RoleType.LEAD
  );

  await assignCommunityRoleToUser(
    users.challengeAdminEmail,
    entitiesId.challengeCommunityId,
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
    entitiesId.challengeCommunityId,
    RoleType.LEAD
  );
});

afterAll(async () => {
  await removeChallenge(entitiesId.challengeId);
  await removeSpace(entitiesId.spaceId);
  await deleteOrganization(entitiesId.organizationId);
});
describe('Notifications - send messages to Private Space, Public Challenge Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
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
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
      'false'
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
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
    await changePreferenceChallenge(
      entitiesId.challengeId,
      ChallengePreferenceType.ALLOW_NON_MEMBERS_READ_ACCESS,
      'true'
    );

    await removeCommunityRoleFromUser(
      users.challengeAdminEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromUser(
      users.challengeMemberEmail,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );

    await removeCommunityRoleFromOrganization(
      entitiesId.organizationId,
      entitiesId.challengeCommunityId,
      RoleType.LEAD
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Challenge community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
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
          toAddresses: [users.nonSpaceMemberEmail],
        }),
      ])
    );
  });
});
