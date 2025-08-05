import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { updateSpaceSettings } from '@functional-api/journey/space/space.request.params';
import { sendMessageToCommunityLeads } from '@functional-api/communications/communication.params';
import {
  removeRoleFromUser,
  assignRoleToUser,
  assignRoleToOrganization,
  removeRoleFromOrganization,
} from '@functional-api/roleset/roles-request.params';
import { updateOrganization } from '@functional-api/contributor-management/organization/organization.request.params';
import { SpacePrivacyMode } from '@alkemio/client-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const senders = (communityName: string) => {
  return `You have sent a message to ${communityName} community`;
};

const receivers = (senderDisplayName: string) => {
  return `${senderDisplayName} sent a message to your community`;
};

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'messaging-user-community-leads-subspace',
  space: {
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
    settings: {
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
    },
    subspace: {
      community: {
        admins: [TestUser.SUBSPACE_ADMIN],
        members: [
          TestUser.SUBSPACE_MEMBER,
          TestUser.SUBSPACE_ADMIN,
          TestUser.SUBSUBSPACE_MEMBER,
          TestUser.SUBSUBSPACE_ADMIN,
        ],
        leads: [TestUser.SUBSPACE_ADMIN],
      },
    },
  },
};

beforeAll(async () => {
  await deleteMailSlurperMails();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await updateOrganization(baseScenario.organization.id, {
    legalEntityName: 'legalEntityName',
    domain: 'domain',
    website: 'https://website.org',
    contactEmail: 'test-org@alkem.io',
  });

  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );

  await assignRoleToUser(
    TestUserManager.users.spaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );

  await assignRoleToOrganization(
    baseScenario.organization.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceMember.id,
    baseScenario.subspace.community.roleSetId,
    RoleName.Lead
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
describe('Notifications - send messages to Private Space, Public Subspace Community Leads', () => {
  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  // ToDo: fix test
  test.skip('NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
        expect.objectContaining({
          subject: senders(baseScenario.subspace.about.profile.displayName),
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Space member send message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.SPACE_ADMIN
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.spaceAdmin.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.spaceAdmin.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
        expect.objectContaining({
          subject: senders(baseScenario.subspace.about.profile.displayName),
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Private Subspace Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(baseScenario.subspace.id, {
      privacy: {
        mode: SpacePrivacyMode.Private,
      },
    });
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.nonSpaceMember.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
        expect.objectContaining({
          subject: senders(baseScenario.subspace.about.profile.displayName),
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });

  test('Subspace member send message to Subspace community (2 User Leads, 1 Org Lead) - 3 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.SPACE_ADMIN
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(3);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: receivers(TestUserManager.users.spaceAdmin.displayName),
          toAddresses: [TestUserManager.users.subspaceAdmin.email],
        }),
        expect.objectContaining({
          subject: receivers(TestUserManager.users.spaceAdmin.displayName),
          toAddresses: [TestUserManager.users.subspaceMember.email],
        }),
        expect.objectContaining({
          subject: senders(baseScenario.subspace.about.profile.displayName),
          toAddresses: [TestUserManager.users.spaceAdmin.email],
        }),
      ])
    );
  });
});

describe('Notifications - send messages to Private Space, Public Subspace NO Community Leads', () => {
  beforeAll(async () => {
    await updateSpaceSettings(baseScenario.subspace.id, {
      privacy: {
        mode: SpacePrivacyMode.Public,
      },
    });

    await removeRoleFromUser(
      TestUserManager.users.subspaceAdmin.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );

    await removeRoleFromUser(
      TestUserManager.users.subspaceMember.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );

    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Lead
    );
  });

  beforeEach(async () => {
    await deleteMailSlurperMails();
  });

  test('NOT space member sends message to Subspace community (0 User Leads, 0 Org Lead) - 1 messages sent', async () => {
    // Act
    await sendMessageToCommunityLeads(
      baseScenario.subspace.community.id,
      'Test message',
      TestUser.NON_SPACE_MEMBER
    );
    await delay(3000);

    const getEmailsData = await getMailsData();

    // Assert
    expect(getEmailsData[1]).toEqual(1);
    expect(getEmailsData[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: senders(baseScenario.subspace.about.profile.displayName),
          toAddresses: [TestUserManager.users.nonSpaceMember.email],
        }),
      ])
    );
  });
});
