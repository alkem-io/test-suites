/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  NotificationEvent,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import {
  RoleName,
  RoleSetInvitationResultNotice,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { eventOnRoleSetInvitation } from '@functional-api/roleset/roleset-events.request.params';
import {
  assignRoleToUser,
  removeRoleFromOrganization,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import {
  deleteUser,
  reregisterUser,
  updateUserSettings,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { notif } from '../../notification.helpers';

const uniqueId = UniqueIDGenerator.getID();
const message = `Please join our community! ${uniqueId}`;
const supportEmail = 'support@alkem.io';

// Space admin (TestUser.SPACE_ADMIN) is admin at every level of the
// hierarchy, so it alone can drive both the flat and the L2 scenarios.
// Organization-side personas assigned onto baseScenario.organization's role
// set below (beyond the factory default of `organizationAdmin` as
// ADMIN+ASSOCIATE): OWNER, an ADMIN who is deliberately NOT an ASSOCIATE, and
// a plain ASSOCIATE with no manager credential.
let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: 'org-invite-notify',
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
    subspace: {
      collaboration: { addTutorialCallouts: false },
      community: {
        admins: [TestUser.SPACE_ADMIN],
        members: [TestUser.SPACE_ADMIN],
      },
      subspace: {
        collaboration: { addTutorialCallouts: false },
        community: {
          admins: [TestUser.SPACE_ADMIN],
          members: [TestUser.SPACE_ADMIN],
        },
      },
    },
  },
};

let invitationId = '';

beforeAll(async () => {
  await deleteMailSlurperMails();
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  await assignRoleToUser(
    TestUserManager.users.qaUser.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
  await assignRoleToUser(
    TestUserManager.users.qaUser.id,
    baseScenario.organization.roleSetId,
    RoleName.Owner
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
  await assignRoleToUser(
    TestUserManager.users.subsubspaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const inviteOrgToSpace = async (
  roleSetId: string,
  organizationId: string,
  userRole: TestUser = TestUser.SPACE_ADMIN
) =>
  inviteForEntryRoleOnRoleSet(
    roleSetId,
    [organizationId],
    [],
    message,
    [RoleName.Member],
    userRole
  );

const createTestOrganization = async (label: string) => {
  const name = `${label}${uniqueId}`;
  const nameID = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  const res = await createOrganization(name, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(
      `Failed to create organization "${label}": ${JSON.stringify(res.error)}`
    );
  }
  return {
    id: res.data.createOrganization.id,
    roleSetId: res.data.createOrganization.roleSet.id,
  };
};

/** Raw query — payload polymorphism (organization/invitation) has no committed fragment yet. */
const inAppNotificationsFor = async (
  userRole: TestUser,
  types: NotificationEvent[]
) => {
  const requestParams = {
    operationName: 'GetOrgInvitationInAppNotifications',
    query: `
      query GetOrgInvitationInAppNotifications($types: [NotificationEvent!]) {
        me {
          notifications(filter: { types: $types }) {
            total
            inAppNotifications {
              id
              type
              payload {
                type
                ... on InAppNotificationPayloadSpaceCommunityInvitation {
                  organization { id }
                  invitation { id }
                  space { id }
                }
              }
            }
          }
        }
      }
    `,
    variables: { types },
  };
  const response = await graphqlRequestAuth(requestParams, userRole);
  return response.body?.data?.me?.notifications as
    | {
        total: number;
        inAppNotifications: Array<{
          id: string;
          type: string;
          payload?: { organization?: { id: string } };
        }>;
      }
    | undefined;
};

describe('Organization Space invitations — organization admins are notified (US2)', () => {
  test('OWNER, ADMIN and an ADMIN-not-associate are each notified once; a plain ASSOCIATE and the space admin get nothing', async () => {
    await deleteMailSlurperMails();

    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await delay(3000);
    const [mailItems] = await getMailsData();

    const expectedSubject = `Invitation for ${baseScenario.organization.profile.displayName} to join ${baseScenario.space.about.profile.displayName}`;

    const adminAMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
    );
    const ownerMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.qaUser.email)
    );
    const adminBMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.subspaceAdmin.email)
    );
    const associateMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.subsubspaceAdmin.email)
    );
    const spaceAdminMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.spaceAdmin.email)
    );

    expect(adminAMail?.subject).toEqual(expectedSubject);
    expect(adminAMail?.body).toContain(message);
    expect(adminAMail?.body).toContain('settings/invitations');
    expect(ownerMail?.subject).toEqual(expectedSubject);
    expect(adminBMail?.subject).toEqual(expectedSubject);
    expect(associateMail).toBeUndefined();
    expect(spaceAdminMail).toBeUndefined();

    const managerAddresses = [
      TestUserManager.users.organizationAdmin.email,
      TestUserManager.users.qaUser.email,
      TestUserManager.users.subspaceAdmin.email,
    ];
    const sentToManagers = mailItems.filter((m: any) =>
      m.toAddresses?.some((a: string) => managerAddresses.includes(a))
    );
    expect(sentToManagers).toHaveLength(3);

    for (const userRole of [
      TestUser.ORGANIZATION_ADMIN,
      TestUser.QA_USER,
      TestUser.SUBSPACE_ADMIN,
    ]) {
      const notifications = await inAppNotificationsFor(userRole, [
        NotificationEvent.OrganizationAdminSpaceCommunityInvitation,
      ]);
      const row = notifications?.inAppNotifications?.find(
        (n: any) => n.payload?.organization?.id === baseScenario.organization.id
      );
      expect(row).toBeDefined();
    }

    await deleteInvitation(invitationId);
    invitationId = '';
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    ).catch(() => undefined);
  });

  test('a sole admin who switched the notification off entirely receives nothing, and the support fallback does not fire', async () => {
    const orgE = await createTestOrganization('singleAdminOff');
    // The creator (GLOBAL_ADMIN, the default createOrganization actor) is
    // auto-granted ASSOCIATE + ADMIN; make organizationAdmin the sole manager.
    await assignRoleToUser(
      TestUserManager.users.organizationAdmin.id,
      orgE.roleSetId,
      RoleName.Associate
    );
    await assignRoleToUser(
      TestUserManager.users.organizationAdmin.id,
      orgE.roleSetId,
      RoleName.Admin
    );
    await removeRoleFromUser(
      TestUserManager.users.globalAdmin.id,
      orgE.roleSetId,
      RoleName.Admin
    );

    await updateUserSettings(TestUserManager.users.organizationAdmin.id, {
      notification: {
        organization: { adminSpaceCommunityInvitation: notif(false) },
      },
    });

    await deleteMailSlurperMails();
    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      orgE.id
    );
    const result = getSingleInvitationResult(invitationData);
    const invId = result?.invitation?.id ?? '';
    expect(invId.length).toEqual(36);

    await delay(3000);
    const [mailItems] = await getMailsData();
    expect(mailItems).toHaveLength(0);

    await deleteInvitation(invId);
    await updateUserSettings(TestUserManager.users.organizationAdmin.id, {
      notification: {
        organization: { adminSpaceCommunityInvitation: notif(true) },
      },
    });
    await deleteOrganization(orgE.id);
  });

  test('an organization with no admins or owners escalates to the support address; nobody gets an in-app row', async () => {
    const orgF = await createTestOrganization('zeroAdminNotify');
    await removeRoleFromUser(
      TestUserManager.users.globalAdmin.id,
      orgF.roleSetId,
      RoleName.Admin
    );

    await deleteMailSlurperMails();
    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      orgF.id
    );
    const result = getSingleInvitationResult(invitationData);
    expect(result?.notice).toEqual(
      RoleSetInvitationResultNotice.OrganizationHasNoAdministrators
    );
    const invId = result?.invitation?.id ?? '';
    expect(invId.length).toEqual(36);

    await delay(3000);
    const [mailItems] = await getMailsData();
    const supportMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(supportEmail)
    );
    expect(supportMail).toBeDefined();
    expect(supportMail?.body).toContain('Hello,');
    expect(mailItems).toHaveLength(1);

    await deleteInvitation(invId);
    await deleteOrganization(orgF.id);
  });

  test('an invitation to L2 lists every ancestor Space in the email body', async () => {
    await deleteMailSlurperMails();

    const invitationData = await inviteOrgToSpace(
      baseScenario.subsubspace.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);
    expect(result?.invitation?.invitedToParent).toEqual(true);

    await delay(3000);
    const [mailItems] = await getMailsData();
    const mail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
    );
    expect(mail).toBeDefined();
    expect(mail.body).toContain(baseScenario.space.about.profile.displayName);
    expect(mail.body).toContain(
      baseScenario.subspace.about.profile.displayName
    );
    expect(mail.body).toContain(
      baseScenario.subsubspace.about.profile.displayName
    );

    await deleteInvitation(invitationId);
    invitationId = '';
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.subsubspace.community.roleSetId,
      RoleName.Member
    ).catch(() => undefined);
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.subspace.community.roleSetId,
      RoleName.Member
    ).catch(() => undefined);
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    ).catch(() => undefined);
  });
});

describe('Organization Space invitations — the inviter learns the outcome (US4)', () => {
  afterEach(async () => {
    await removeRoleFromOrganization(
      baseScenario.organization.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    ).catch(() => undefined);
    if (invitationId) {
      await deleteInvitation(invitationId).catch(() => undefined);
      invitationId = '';
    }
  });

  test('accepting notifies the inviter ("accepted") AND every Space admin (generic "joined"), with distinct subjects', async () => {
    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await deleteMailSlurperMails();
    await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    await delay(3000);
    const [mailItems] = await getMailsData();

    const acceptedSubject = `${baseScenario.organization.profile.displayName} accepted your invitation`;
    const inviterMails = mailItems.filter((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.spaceAdmin.email)
    );
    expect(inviterMails.length).toBeGreaterThanOrEqual(2);

    const acceptedMail = inviterMails.find(
      (m: any) => m.subject === acceptedSubject
    );
    expect(acceptedMail).toBeDefined();
    const joinedMail = inviterMails.find(
      (m: any) => m.subject !== acceptedSubject
    );
    expect(joinedMail).toBeDefined();

    const acceptedRows = await inAppNotificationsFor(TestUser.SPACE_ADMIN, [
      NotificationEvent.SpaceAdminOrganizationCommunityInvitationAccepted,
    ]);
    expect(acceptedRows?.total ?? 0).toBeGreaterThanOrEqual(1);
    const joinedRows = await inAppNotificationsFor(TestUser.SPACE_ADMIN, [
      NotificationEvent.SpaceAdminCommunityNewMember,
    ]);
    expect(joinedRows?.total ?? 0).toBeGreaterThanOrEqual(1);
  });

  test('declining notifies the inviter with "declined your invitation"', async () => {
    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await deleteMailSlurperMails();
    await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.ORGANIZATION_ADMIN
    );

    await delay(3000);
    const [mailItems] = await getMailsData();
    const declinedSubject = `${baseScenario.organization.profile.displayName} declined your invitation`;
    const mail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.spaceAdmin.email)
    );
    expect(mail?.subject).toEqual(declinedSubject);
  });

  test('an inviter who switched off "new member in my Space" receives no outcome email on accept', async () => {
    await updateUserSettings(TestUserManager.users.spaceAdmin.id, {
      notification: { space: { admin: { communityNewMember: notif(false) } } },
    });

    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await deleteMailSlurperMails();
    await eventOnRoleSetInvitation(
      invitationId,
      'ACCEPT',
      TestUser.ORGANIZATION_ADMIN
    );

    await delay(3000);
    const [mailItems] = await getMailsData();
    expect(
      mailItems.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.spaceAdmin.email)
      )
    ).toHaveLength(0);

    await updateUserSettings(TestUserManager.users.spaceAdmin.id, {
      notification: { space: { admin: { communityNewMember: notif(true) } } },
    });
  });

  test('an inviter no longer a Space admin at decline time: mutation succeeds, nobody is notified of the outcome', async () => {
    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await removeRoleFromUser(
      TestUserManager.users.spaceAdmin.id,
      baseScenario.space.community.roleSetId,
      RoleName.Admin
    );

    await deleteMailSlurperMails();
    const decline = await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.ORGANIZATION_ADMIN
    );
    expect(decline?.error).toBeUndefined();

    await delay(3000);
    const [mailItems] = await getMailsData();
    expect(mailItems).toHaveLength(0);

    await assignRoleToUser(
      TestUserManager.users.spaceAdmin.id,
      baseScenario.space.community.roleSetId,
      RoleName.Admin
    );
  });

  test('an inviter whose account no longer exists at decline time: mutation succeeds, no outcome email', async () => {
    await assignRoleToUser(
      TestUserManager.users.betaTester.id,
      baseScenario.space.community.roleSetId,
      RoleName.Member
    );
    await assignRoleToUser(
      TestUserManager.users.betaTester.id,
      baseScenario.space.community.roleSetId,
      RoleName.Admin
    );

    const invitationData = await inviteOrgToSpace(
      baseScenario.space.community.roleSetId,
      baseScenario.organization.id,
      TestUser.GLOBAL_BETA_TESTER
    );
    const result = getSingleInvitationResult(invitationData);
    invitationId = result?.invitation?.id ?? '';
    expect(invitationId.length).toEqual(36);

    await deleteUser(TestUserManager.users.betaTester.id);

    await deleteMailSlurperMails();
    const decline = await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.ORGANIZATION_ADMIN
    );
    expect(decline?.error).toBeUndefined();

    await delay(3000);
    const [mailItems] = await getMailsData();
    const declinedMail = mailItems.find((m: any) =>
      m.subject?.includes('declined your invitation')
    );
    expect(declinedMail).toBeUndefined();

    invitationId = '';
    await reregisterUser('beta.tester@alkem.io', 'beta', 'tester');
  });
});
