/* eslint-disable @typescript-eslint/no-explicit-any */
// 062-organization-user-associates — the seven wire events on five settings
// rows, end to end through the notifications worktree service + MailSlurper.
// Follows `notifications/space/community/organization-invitations.it-spec.ts`
// (061) and `notification.helpers.ts` for the mail/push/in-app idioms.
//
// Admins on the scenario organization: `organizationAdmin` (ASSOCIATE+ADMIN,
// factory default) and `subspaceAdmin` (ASSOCIATE+ADMIN, assigned here) — 2
// ADMIN recipients. `spaceMember` is ADMIN-not-associate (also notified,
// FR-013). `qaUser` is OWNER-not-admin — never notified (061 R17b, carried).
import {
  deleteMailSlurperMails,
  NotificationEvent,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  waitForQueuePublishIncrease,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import {
  deleteInvitation,
  inviteForEntryRoleOnRoleSet,
} from '@functional-api/roleset/invitations/invitation.request.params';
import { getSingleInvitationResult } from '@functional-api/roleset/roleset.request.params';
import { eventOnRoleSetInvitation } from '@functional-api/roleset/roleset-events.request.params';
import { eventOnRoleSetApplication } from '@functional-api/roleset/roleset-events.request.params';
import {
  applyToAssociateWithOrganization,
  deleteApplication,
} from '@functional-api/roleset/application/application.request.params';
import {
  assignRoleToUser,
  joinRoleSet,
  removeRoleFromUser,
} from '@functional-api/roleset/roles-request.params';
import {
  createUserDataOrFail,
  deleteUser,
  updateUserSettings,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
  updateOrganizationSettings,
} from '@functional-api/contributor-management/organization/organization.request.params';
import { verifyOrganizationManually } from '@functional-api/contributor-management/organization/organization.request.params';
import {
  allChannelsOn,
  expectExactMailsAfter,
  getPushQueuePublishedTotal,
  notif,
  notifWithPush,
  PUSH_NOTIFICATIONS_QUEUE,
  waitForMailsCountAtLeast,
} from '../notification.helpers';

const uniqueId = UniqueIDGenerator.getID();
const supportEmail = 'support@alkem.io';

let baseScenario: OrganizationWithSpaceModel;
const scenarioConfig: TestScenarioConfig = {
  name: `org-associate-notify-${uniqueId}`,
};

// Muted settings restored in afterAll — see the notification.helpers
// `allChannelsOn` doc comment: shared personas outlive this file.
const mutedPersonas: Array<{ id: string; settings: any }> = [];
const trackMuted = (id: string, settings: any) => {
  mutedPersonas.push({ id, settings });
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenarioOrganization(
    scenarioConfig
  );
  // The factory-default creator (GLOBAL_ADMIN) is auto-granted
  // ASSOCIATE+ADMIN; strip it so the admin set is exactly the three
  // documented personas below.
  await removeRoleFromUser(
    TestUserManager.users.globalAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Associate
  );
  await assignRoleToUser(
    TestUserManager.users.subspaceAdmin.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
  await assignRoleToUser(
    TestUserManager.users.spaceMember.id,
    baseScenario.organization.roleSetId,
    RoleName.Admin
  );
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
});

afterAll(async () => {
  for (const { id, settings } of mutedPersonas) {
    await updateUserSettings(id, allChannelsOn(settings)).catch(
      () => undefined
    );
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

/** Raw query — the two new payload kinds have no committed fragment yet. */
const inAppNotificationsFor = async (
  userRole: TestUser,
  types: NotificationEvent[]
) => {
  const requestParams = {
    operationName: 'GetOrgAssociateInAppNotifications',
    query: `
      query GetOrgAssociateInAppNotifications($types: [NotificationEvent!]) {
        me {
          notifications(filter: { types: $types }) {
            total
            inAppNotifications {
              id
              type
              payload {
                type
                ... on InAppNotificationPayloadOrganizationAssociateInvitation {
                  organization { id }
                  invitation { id extraRoles }
                }
                ... on InAppNotificationPayloadOrganizationAssociateActor {
                  organization { id }
                  actor { id }
                  application { id }
                  invitation { id }
                  extraRolesWithheld
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
          payload?: any;
        }>;
      }
    | undefined;
};

const orgUrl = () =>
  `/organization/${baseScenario.organization.nameId}`;
const orgAssociatesUrl = () =>
  `/organization/${baseScenario.organization.nameId}/settings/community`;

describe('Organization associate invitations — the invitee is told (US2-AS1)', () => {
  test('the invitee gets exactly one email, one in-app row and one push emit; the admins get nothing yet', async () => {
    const message = `Come associate! ${uniqueId}`;
    await deleteMailSlurperMails();
    const pushBaseline = await getPushQueuePublishedTotal();

    let invitationId = '';
    const [mailItems] = await expectExactMailsAfter(async () => {
      const res = await inviteForEntryRoleOnRoleSet(
        baseScenario.organization.roleSetId,
        [TestUserManager.users.nonSpaceMember.id],
        [],
        message,
        [RoleName.Admin],
        TestUser.ORGANIZATION_ADMIN
      );
      invitationId = getSingleInvitationResult(res)!.invitation!.id;
    }, 1);

    const mail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.nonSpaceMember.email)
    );
    expect(mail).toBeDefined();
    expect(mail.subject).toContain(
      baseScenario.organization.profile.displayName
    );
    expect(mail.body).toContain(message);
    expect(mail.body).toContain(orgUrl());

    await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      pushBaseline,
      1,
      { timeout: 15_000 }
    );

    const rows = await inAppNotificationsFor(TestUser.NON_SPACE_MEMBER, [
      NotificationEvent.UserOrganizationAssociateInvitation,
    ]);
    const row = rows?.inAppNotifications.find(
      n => n.payload?.organization?.id === baseScenario.organization.id
    );
    expect(row).toBeDefined();
    expect(row?.payload?.invitation?.extraRoles).toEqual([RoleName.Admin]);

    await eventOnRoleSetInvitation(
      invitationId,
      'REJECT',
      TestUser.NON_SPACE_MEMBER
    );
  });
});

describe('Organization associate invitations — the response is told to the other admins (US2-AS2/AS3/AS5)', () => {
  test('ACCEPT notifies every admin (never the acceptor) and produces no "joined" for this acceptance', async () => {
    const invite = await inviteForEntryRoleOnRoleSet(
      baseScenario.organization.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
      [],
      TestUser.ORGANIZATION_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

    await deleteMailSlurperMails();
    const [mailItems] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetInvitation(
          invitationId,
          'ACCEPT',
          TestUser.NON_SPACE_MEMBER
        ),
      3 // organizationAdmin + subspaceAdmin + spaceMember
    );
    for (const admin of [
      TestUserManager.users.organizationAdmin,
      TestUserManager.users.subspaceAdmin,
      TestUserManager.users.spaceMember,
    ]) {
      const mail = mailItems.find((m: any) =>
        m.toAddresses?.includes(admin.email)
      );
      expect(mail?.subject).toContain('accepted');
    }
    expect(
      mailItems.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.nonSpaceMember.email)
      )
    ).toHaveLength(0);
    expect(
      mailItems.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.qaUser.email)
      )
    ).toHaveLength(0);

    // No "joined" for an acceptance — the response notification replaces it.
    const joinedRows = await inAppNotificationsFor(TestUser.ORGANIZATION_ADMIN, [
      NotificationEvent.OrganizationAdminAssociateJoined,
    ]);
    expect(
      joinedRows?.inAppNotifications.find(
        n => n.payload?.actor?.id === TestUserManager.users.nonSpaceMember.id
      )
    ).toBeUndefined();

    await removeRoleFromUser(
      TestUserManager.users.nonSpaceMember.id,
      baseScenario.organization.roleSetId,
      RoleName.Associate
    ).catch(() => undefined);
  });

  test('accepting with a consumed Owner cap: the accepted email states Owner was not granted', async () => {
    const owner2 = await createUserDataOrFail({
      profileData: { displayName: 'Owner Two' },
    });
    const owner3 = await createUserDataOrFail({
      profileData: { displayName: 'Owner Three' },
    });
    try {
      await assignRoleToUser(
        owner2.id,
        baseScenario.organization.roleSetId,
        RoleName.Owner
      );
      await assignRoleToUser(
        owner3.id,
        baseScenario.organization.roleSetId,
        RoleName.Owner
      );
      // qaUser + owner2 + owner3 = 3 (the cap).

      const invite = await inviteForEntryRoleOnRoleSet(
        baseScenario.organization.roleSetId,
        [TestUserManager.users.subsubspaceMember.id],
        [],
        'welcome',
        [RoleName.Owner],
        TestUser.ORGANIZATION_ADMIN
      );
      const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

      await deleteMailSlurperMails();
      const [mailItems] = await expectExactMailsAfter(
        () =>
          eventOnRoleSetInvitation(
            invitationId,
            'ACCEPT',
            TestUser.SUBSUBSPACE_MEMBER
          ),
        3
      );
      const adminMail = mailItems.find((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
      );
      expect(adminMail?.body).toContain('Owner');

      await removeRoleFromUser(
        TestUserManager.users.subsubspaceMember.id,
        baseScenario.organization.roleSetId,
        RoleName.Associate
      ).catch(() => undefined);
    } finally {
      await deleteUser(owner2.id).catch(() => undefined);
      await deleteUser(owner3.id).catch(() => undefined);
    }
  });

  test('REJECT notifies the admins with "declined"', async () => {
    const invite = await inviteForEntryRoleOnRoleSet(
      baseScenario.organization.roleSetId,
      [TestUserManager.users.subsubspaceAdmin.id],
      [],
      'welcome',
      [],
      TestUser.ORGANIZATION_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

    await deleteMailSlurperMails();
    const [mailItems] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetInvitation(
          invitationId,
          'REJECT',
          TestUser.SUBSUBSPACE_ADMIN
        ),
      3
    );
    const mail = mailItems.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
    );
    expect(mail?.subject).toContain('declined');
  });
});

describe('Organization associate applications — the admins are told, the applicant is told the decision (US3-AS2/AS3/AS4)', () => {
  test('applying notifies every ADMIN (note in body, not subject); ADMIN-not-associate included, OWNER-not-admin excluded', async () => {
    const note = `a note ${uniqueId}`;
    await deleteMailSlurperMails();
    let applicationId = '';
    const [mailItems] = await expectExactMailsAfter(async () => {
      const res = await applyToAssociateWithOrganization(
        baseScenario.organization.roleSetId,
        note,
        TestUser.SUBSUBSPACE_ADMIN
      );
      applicationId = res?.data?.applyForEntryRoleOnRoleSet?.id ?? '';
    }, 3);
    for (const admin of [
      TestUserManager.users.organizationAdmin,
      TestUserManager.users.subspaceAdmin,
      TestUserManager.users.spaceMember,
    ]) {
      const mail = mailItems.find((m: any) =>
        m.toAddresses?.includes(admin.email)
      );
      expect(mail).toBeDefined();
      expect(mail?.subject).not.toContain(note);
      expect(mail?.body).toContain(note);
      expect(mail?.body).toContain(orgAssociatesUrl());
    }
    expect(
      mailItems.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.qaUser.email)
      )
    ).toHaveLength(0);

    await deleteApplication(applicationId).catch(() => undefined);
  });

  test('APPROVE tells the applicant ("approved") and the OTHER admins ("joined", approver excluded); REJECT tells the applicant ("declined")', async () => {
    const applyApprove = await applyToAssociateWithOrganization(
      baseScenario.organization.roleSetId,
      'note',
      TestUser.GLOBAL_BETA_TESTER
    );
    const approveAppId =
      applyApprove?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

    await deleteMailSlurperMails();
    const [approveMails] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetApplication(
          approveAppId,
          'APPROVE',
          TestUser.ORGANIZATION_ADMIN
        ),
      3 // applicant "approved" + the 2 OTHER admins "joined" (approver excluded)
    );
    const applicantMail = approveMails.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.betaTester.email)
    );
    expect(applicantMail?.subject).toContain('approved');
    expect(applicantMail?.body).toContain(orgUrl());

    const approverMail = approveMails.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
    );
    expect(approverMail).toBeUndefined();
    const otherAdminMail = approveMails.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.subspaceAdmin.email)
    );
    expect(otherAdminMail?.subject).toContain('joined');

    await removeRoleFromUser(
      TestUserManager.users.betaTester.id,
      baseScenario.organization.roleSetId,
      RoleName.Associate
    ).catch(() => undefined);

    const applyReject = await applyToAssociateWithOrganization(
      baseScenario.organization.roleSetId,
      'note',
      TestUser.SUBSUBSPACE_MEMBER
    );
    const rejectAppId =
      applyReject?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

    await deleteMailSlurperMails();
    const [rejectMails] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetApplication(
          rejectAppId,
          'REJECT',
          TestUser.ORGANIZATION_ADMIN
        ),
      1
    );
    const declinedMail = rejectMails.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.subsubspaceMember.email)
    );
    expect(declinedMail?.subject).toContain('declined');
  });

  test('US3-AS8: a zero-admin organization escalates to support; nobody gets an in-app row', async () => {
    const orgName = `zero-admin-associates-${uniqueId}`;
    const nameId = orgName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
    const orgRes = await createOrganization(orgName, nameId);
    const org = orgRes.data!.createOrganization!;
    await removeRoleFromUser(
      TestUserManager.users.globalAdmin.id,
      org.roleSet.id,
      RoleName.Admin
    );
    // Keep an OWNER so the organization is not orphaned — owners are
    // irrelevant to the zero-ADMIN count (061 R17b).
    await assignRoleToUser(
      TestUserManager.users.qaUser.id,
      org.roleSet.id,
      RoleName.Owner
    );

    await deleteMailSlurperMails();
    const [mailItems] = await expectExactMailsAfter(
      () =>
        applyToAssociateWithOrganization(
          org.roleSet.id,
          'note',
          TestUser.SUBSPACE_MEMBER
        ),
      1
    );
    const supportMail = mailItems.find((m: any) =>
      m.toAddresses?.includes(supportEmail)
    );
    expect(supportMail).toBeDefined();
    expect(supportMail?.body).toContain('Hello,');
    expect(supportMail?.body).toContain('no administrators');
    expect(mailItems).toHaveLength(1);

    await deleteOrganization(org.id).catch(() => undefined);
  });
});

describe('Domain-match join notifies the other admins (US4-AS1)', () => {
  test('joining via the domain door notifies every admin ("joined"); the joiner gets nothing', async () => {
    const orgName = `domain-join-associates-${uniqueId}`;
    const nameId = orgName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
    const orgRes = await createOrganization(orgName, nameId);
    const org = orgRes.data!.createOrganization!;
    try {
      await removeRoleFromUser(
        TestUserManager.users.globalAdmin.id,
        org.roleSet.id,
        RoleName.Admin
      );
      await assignRoleToUser(
        TestUserManager.users.organizationAdmin.id,
        org.roleSet.id,
        RoleName.Associate
      );
      await assignRoleToUser(
        TestUserManager.users.organizationAdmin.id,
        org.roleSet.id,
        RoleName.Admin
      );
      // The domain door checks a verified domain match — every fixed
      // `TestUser` persona already lives at `@alkem.io`, so setting the
      // organization's own domain to it lets a spare persona join for real
      // through the mutation, without a fresh out-of-band registration.
      await updateOrganization(org.id, { domain: 'alkem.io' });
      await verifyOrganizationManually(org.id);
      await updateOrganizationSettings(org.id, {
        membership: { allowUsersMatchingDomainToJoin: true },
      });

      await deleteMailSlurperMails();
      const [mailItems] = await expectExactMailsAfter(
        () => joinRoleSet(org.roleSet.id, TestUser.SUBSUBSPACE_ADMIN),
        1
      );
      const adminMail = mailItems.find((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
      );
      expect(adminMail?.subject).toContain('joined');
      expect(
        mailItems.filter((m: any) =>
          m.toAddresses?.includes(
            TestUserManager.users.subsubspaceAdmin.email
          )
        )
      ).toHaveLength(0);
    } finally {
      await deleteOrganization(org.id).catch(() => undefined);
    }
  });
});

describe('Notification settings mute the right event only (US6-AS2)', () => {
  test('muting "someone applied to associate" on one admin: that admin gets nothing, the other admins are notified, no support escalation', async () => {
    const muteSettings = {
      notification: {
        organization: {
          adminAssociateApplicationReceived: notifWithPush(false),
        },
      },
    };
    trackMuted(TestUserManager.users.spaceMember.id, muteSettings);
    await updateUserSettings(TestUserManager.users.spaceMember.id, muteSettings);
    try {
      await deleteMailSlurperMails();
      const [mailItems] = await expectExactMailsAfter(
        () =>
          applyToAssociateWithOrganization(
            baseScenario.organization.roleSetId,
            'note',
            TestUser.NON_SPACE_MEMBER
          ),
        2 // organizationAdmin + subspaceAdmin; spaceMember is muted
      );
      expect(
        mailItems.filter((m: any) =>
          m.toAddresses?.includes(TestUserManager.users.spaceMember.email)
        )
      ).toHaveLength(0);
      expect(
        mailItems.filter((m: any) =>
          m.toAddresses?.includes(supportEmail)
        )
      ).toHaveLength(0);

      await removeRoleFromUser(
        TestUserManager.users.nonSpaceMember.id,
        baseScenario.organization.roleSetId,
        RoleName.Associate
      ).catch(() => undefined);
    } finally {
      await updateUserSettings(
        TestUserManager.users.spaceMember.id,
        allChannelsOn(muteSettings)
      );
    }
  });

  test('muting the invitee-side "invited to associate" setting suppresses the invitation email', async () => {
    const muteSettings = {
      notification: {
        user: {
          membership: {
            organizationAssociateInvitationReceived: notif(false),
          },
        },
      },
    };
    trackMuted(TestUserManager.users.subsubspaceMember.id, muteSettings);
    await updateUserSettings(
      TestUserManager.users.subsubspaceMember.id,
      muteSettings
    );
    let invitationId = '';
    try {
      await deleteMailSlurperMails();
      const res = await inviteForEntryRoleOnRoleSet(
        baseScenario.organization.roleSetId,
        [TestUserManager.users.subsubspaceMember.id],
        [],
        'welcome',
        [],
        TestUser.ORGANIZATION_ADMIN
      );
      invitationId = getSingleInvitationResult(res)!.invitation!.id;

      const [mailItems] = await waitForMailsCountAtLeast(1, {
        timeout: 18_000,
      });
      expect(
        mailItems.filter((m: any) =>
          m.toAddresses?.includes(
            TestUserManager.users.subsubspaceMember.email
          )
        )
      ).toHaveLength(0);
    } finally {
      if (invitationId) {
        await deleteInvitation(invitationId).catch(() => undefined);
      }
      await updateUserSettings(
        TestUserManager.users.subsubspaceMember.id,
        allChannelsOn(muteSettings)
      );
    }
  });
});
