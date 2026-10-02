/* eslint-disable @typescript-eslint/no-explicit-any */
// The seven wire events on five settings rows, end to end through the
// notifications worktree service + MailSlurper. Follows
// `notifications/space/community/organization-invitations.it-spec.ts` and
// `notification.helpers.ts` for the mail/push/in-app idioms.
//
// Admins on the scenario organization: `organizationAdmin` (ASSOCIATE+ADMIN,
// factory default) and `subspaceAdmin` (ASSOCIATE+ADMIN, assigned here) — 2
// ADMIN recipients. `spaceMember` is ADMIN-not-associate (also notified).
// `qaUser` is OWNER-not-admin — never notified.
import {
  deleteMailSlurperMails,
  NotificationEvent,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
  rabbitMqManagementConfigured,
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
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  waitForMailsCountAtLeast,
  waitForMailsWhere,
} from '../notification.helpers';

const uniqueId = UniqueIDGenerator.getID();
const supportEmail = 'support@alkem.io';

/**
 * A negative in-app read that has to HOLD, not merely be true at one instant:
 * fan-out is asynchronous, so sample the read over a short settle window and
 * require it empty every time.
 */
/** Recipient + subject of every mail, for assertion messages. */
const mailboxSummary = (mails: any[]): string =>
  JSON.stringify(mails.map(m => [m.toAddresses, m.subject]));

const expectStaysEmpty = async (
  read: () => Promise<unknown[]>,
  samples = 3,
  intervalMs = 1_500
): Promise<void> => {
  for (let i = 0; i < samples; i++) {
    expect(await read()).toEqual([]);
    if (i < samples - 1) await new Promise(r => setTimeout(r, intervalMs));
  }
};

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
  // Only the PUSH half reads the RabbitMQ management API, which a loopback
  // compose stack exposes and the nightly target does not. The email and
  // in-app halves are asserted everywhere — gating the whole case behind the
  // queue left the nightly with no test that the invitation email is sent at all.
  test('the invitee gets exactly one email, one in-app row and (where the queue is observable) one push emit; the admins get nothing yet', async () => {
    const message = `Come associate! ${uniqueId}`;
    const checkPush = rabbitMqManagementConfigured();
    await deleteMailSlurperMails();
    // The push adapter publishes nothing for a recipient without an active push
    // subscription, so the invitee needs a (fake, non-delivering) one before the
    // queue counter can move — see `subscribeRecipientsToPush`.
    const pushHandles = checkPush
      ? await subscribeRecipientsToPush([
          { userRole: TestUser.NON_SPACE_MEMBER, label: `assoc-invitee-${uniqueId}` },
        ])
      : [];
    const pushBaseline = checkPush ? await getPushQueuePublishedTotal() : 0;

    let invitationId = '';
    try {
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

    // Exactly one mail FOR THIS INVITATION, to the invitee: "the admins get
    // nothing yet" is a count, not a title. Scoped to the event's subject —
    // the shared mailbox can still carry a straggler from an earlier test,
    // and `expectExactMailsAfter` only waits for >= 1.
    const invitationMails = mailItems.filter((m: any) =>
      m.subject?.includes(baseScenario.organization.profile.displayName)
    );
    expect(invitationMails, mailboxSummary(mailItems)).toHaveLength(1);
    const mail = invitationMails[0];
    expect(mail.toAddresses).toContain(TestUserManager.users.nonSpaceMember.email);
    expect(mail.subject).toContain(
      baseScenario.organization.profile.displayName
    );
    // The message is body-only — never in a subject line (US2-AS1).
    expect(mail.subject).not.toContain(message);
    expect(mail.body).toContain(message);
    expect(mail.body).toContain(orgUrl());

    if (checkPush) {
      // `waitForQueuePublishIncrease` returns the last-observed stats without
      // throwing on timeout — the emit is only proven by asserting on them.
      const pushStats = await waitForQueuePublishIncrease(
        PUSH_NOTIFICATIONS_QUEUE,
        pushBaseline,
        1,
        { timeout: 15_000 }
      );
      expect(pushStats.publishedTotal).toBeGreaterThanOrEqual(pushBaseline + 1);
    }

    const rows = await inAppNotificationsFor(TestUser.NON_SPACE_MEMBER, [
      NotificationEvent.UserOrganizationAssociateInvitation,
    ]);
    const row = rows?.inAppNotifications.find(
      n => n.payload?.organization?.id === baseScenario.organization.id
    );
    expect(row).toBeDefined();
    expect(row?.payload?.invitation?.extraRoles).toEqual([RoleName.Admin]);

    // Drain this rejection's own notifications before the test ends. Declining
    // emails the same three admins asynchronously, and `dispatchNotification`
    // is fire-and-forget: left unawaited, those three mails arrive AFTER the
    // next test's `deleteMailSlurperMails()` and are collected as if they were
    // its own — which is exactly how the ACCEPT test came to assert on a
    // "declined" subject and fail, taking the two tests after it down with it.
    await deleteMailSlurperMails();
    await expectExactMailsAfter(
      () =>
        eventOnRoleSetInvitation(
          invitationId,
          'REJECT',
          TestUser.NON_SPACE_MEMBER
        ),
      3 // organizationAdmin + subspaceAdmin + spaceMember
    );
    } finally {
      await unsubscribeRecipientsFromPush(pushHandles);
    }
  });
});

/**
 * Prune the mailbox so that what follows sees only the mail the NEXT action
 * produces.
 *
 * `deleteMailSlurperMails()` on its own is not a barrier: notification
 * delivery is fire-and-forget, so a mutation returns before its emails are
 * sent and mail triggered *before* the prune lands *after* it — where the next
 * assertion counts it as its own. That is what made the ACCEPT case read the
 * invitation mail as a fourth "acceptance", and the APPROVE case read the
 * three "applied" mails as the approval's. Wait for the in-flight mail to
 * arrive, THEN prune. Requires the mailbox to have been pruned before the
 * action that produced it, since the wait counts the whole mailbox.
 */
const pruneAfterInFlight = async (inFlight: number) => {
  await waitForMailsCountAtLeast(inFlight);
  await deleteMailSlurperMails();
};

describe('Organization associate invitations — the response is told to the other admins (US2-AS2/AS3/AS5)', () => {
  test('ACCEPT notifies every admin (never the acceptor) and produces no "joined" for this acceptance', async () => {
    await deleteMailSlurperMails();
    const invite = await inviteForEntryRoleOnRoleSet(
      baseScenario.organization.roleSetId,
      [TestUserManager.users.nonSpaceMember.id],
      [],
      'welcome',
      [],
      TestUser.ORGANIZATION_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

    await pruneAfterInFlight(1); // the invitee's own invitation mail
    const [mailItems] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetInvitation(
          invitationId,
          'ACCEPT',
          TestUser.NON_SPACE_MEMBER
        ),
      3 // organizationAdmin + subspaceAdmin + spaceMember
    );
    // Exactly three "accepted" mails, one per admin, and no "joined" at all:
    // a leaked "joined" or a mail to the acceptor would show up here, which
    // `expectExactMailsAfter` (>= 3) alone would never notice. Scoped to the
    // event's subject so a straggler from an earlier test cannot fail it.
    const acceptedMails = mailItems.filter((m: any) =>
      /accepted/i.test(m.subject ?? '')
    );
    expect(acceptedMails, mailboxSummary(mailItems)).toHaveLength(3);
    for (const admin of [
      TestUserManager.users.organizationAdmin,
      TestUserManager.users.subspaceAdmin,
      TestUserManager.users.spaceMember,
    ]) {
      expect(
        acceptedMails.filter((m: any) => m.toAddresses?.includes(admin.email)),
        `accepted mail for ${admin.email}`
      ).toHaveLength(1);
    }
    expect(
      mailItems.filter((m: any) => /joined/i.test(m.subject ?? '')),
      mailboxSummary(mailItems)
    ).toHaveLength(0);
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
    // A negative that has to HOLD: sample it over a settle window rather than
    // reading once while the fan-out may still be in flight.
    await expectStaysEmpty(async () => {
      const joinedRows = await inAppNotificationsFor(TestUser.ORGANIZATION_ADMIN, [
        NotificationEvent.OrganizationAdminAssociateJoined,
      ]);
      return (joinedRows?.inAppNotifications ?? [])
        .filter(n => n.payload?.actor?.id === TestUserManager.users.nonSpaceMember.id)
        .map(n => n.id);
    });

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
      // Order matters: the cap must be consumed AFTER the invitation exists.
      // 062 validates the extra-role cap at invite time too (FR-002), so
      // filling it first refuses the invitation outright and the accept-time
      // withheld-role path this test is about can never be reached. Same note
      // as US2-AS5 in organization-associate-invitation.it-spec.ts.
      await deleteMailSlurperMails();
      const invite = await inviteForEntryRoleOnRoleSet(
        baseScenario.organization.roleSetId,
        [TestUserManager.users.subsubspaceMember.id],
        [],
        'welcome',
        [RoleName.Owner],
        TestUser.ORGANIZATION_ADMIN
      );
      const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

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
      // qaUser + owner2 + owner3 = 3 (the cap), so Owner cannot be granted on accept.

      await pruneAfterInFlight(1); // the invitee's own invitation mail
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
      // Assert the discriminating half, not just the role word: the ordinary
      // acceptance copy also contains "Owner" (it names the offered role), so
      // `toContain('Owner')` alone passes even if the withheld sentence is
      // dropped entirely — which is the silent degradation FR-003 forbids.
      expect(adminMail?.body).toMatch(/could not be granted/i);
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
    await deleteMailSlurperMails();
    const invite = await inviteForEntryRoleOnRoleSet(
      baseScenario.organization.roleSetId,
      [TestUserManager.users.subsubspaceAdmin.id],
      [],
      'welcome',
      [],
      TestUser.ORGANIZATION_ADMIN
    );
    const invitationId = getSingleInvitationResult(invite)!.invitation!.id;

    await pruneAfterInFlight(1); // the invitee's own invitation mail
    const [mailItems] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetInvitation(
          invitationId,
          'REJECT',
          TestUser.SUBSUBSPACE_ADMIN
        ),
      3
    );
    // "Every other admin": exactly three "declined" mails, one per admin,
    // none to the invitee. Scoped to the event's subject (see ACCEPT above).
    const declinedMails = mailItems.filter((m: any) =>
      /declined/i.test(m.subject ?? '')
    );
    expect(declinedMails, mailboxSummary(mailItems)).toHaveLength(3);
    for (const admin of [
      TestUserManager.users.organizationAdmin,
      TestUserManager.users.subspaceAdmin,
      TestUserManager.users.spaceMember,
    ]) {
      expect(
        declinedMails.filter((m: any) => m.toAddresses?.includes(admin.email)),
        `declined mail for ${admin.email}`
      ).toHaveLength(1);
    }
    expect(
      declinedMails.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.subsubspaceAdmin.email)
      )
    ).toHaveLength(0);
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
    await deleteMailSlurperMails();
    const applyApprove = await applyToAssociateWithOrganization(
      baseScenario.organization.roleSetId,
      'note',
      TestUser.GLOBAL_BETA_TESTER
    );
    const approveAppId =
      applyApprove?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

    await pruneAfterInFlight(3); // the three "applied to associate" admin mails
    const [approveMails] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetApplication(
          approveAppId,
          'APPROVE',
          TestUser.ORGANIZATION_ADMIN
        ),
      // FR-010 / 061 R40: "joined" is suppressed only where a replacement
      // notification exists, which is the invitation-accept case alone. An
      // approved application has no replacement, so it still notifies the
      // other admins: applicant "approved" + the 2 OTHER admins "joined".
      3
    );
    const applicantMail = approveMails.find((m: any) =>
      m.toAddresses?.includes(TestUserManager.users.betaTester.email)
    );
    expect(applicantMail?.subject).toContain('approved');
    expect(applicantMail?.body).toContain(orgUrl());

    // Exactly one "approved" (the applicant) and exactly two "joined" — "every
    // admin of O other than A", once each, never the approver. Scoped to the
    // events' subjects so a straggler from the "applied" fan-out cannot fail it.
    expect(
      approveMails.filter((m: any) => /approved/i.test(m.subject ?? '')),
      mailboxSummary(approveMails)
    ).toHaveLength(1);
    const joinedMails = approveMails.filter((m: any) =>
      /joined/i.test(m.subject ?? '')
    );
    expect(joinedMails, mailboxSummary(approveMails)).toHaveLength(2);
    expect(
      joinedMails.filter((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.organizationAdmin.email)
      )
    ).toHaveLength(0);
    for (const otherAdmin of [
      TestUserManager.users.subspaceAdmin,
      TestUserManager.users.spaceMember,
    ]) {
      expect(
        joinedMails.filter((m: any) => m.toAddresses?.includes(otherAdmin.email)),
        `joined mail for ${otherAdmin.email}`
      ).toHaveLength(1);
    }

    await removeRoleFromUser(
      TestUserManager.users.betaTester.id,
      baseScenario.organization.roleSetId,
      RoleName.Associate
    ).catch(() => undefined);

    await deleteMailSlurperMails();
    const applyReject = await applyToAssociateWithOrganization(
      baseScenario.organization.roleSetId,
      'note',
      TestUser.SUBSUBSPACE_MEMBER
    );
    const rejectAppId =
      applyReject?.data?.applyForEntryRoleOnRoleSet?.id ?? '';

    await pruneAfterInFlight(3); // the three "applied to associate" admin mails
    const [rejectMails] = await expectExactMailsAfter(
      () =>
        eventOnRoleSetApplication(
          rejectAppId,
          'REJECT',
          TestUser.ORGANIZATION_ADMIN
        ),
      1
    );
    // Only the applicant hears about a rejection — exactly one "declined",
    // and it is theirs.
    const rejectDeclined = rejectMails.filter((m: any) =>
      /declined/i.test(m.subject ?? '')
    );
    expect(rejectDeclined, mailboxSummary(rejectMails)).toHaveLength(1);
    expect(rejectDeclined[0].toAddresses).toContain(
      TestUserManager.users.subsubspaceMember.email
    );
  });

  test('US3-AS8: a zero-admin organization escalates to support; nobody gets an in-app row', async () => {
    const orgName = `zero-admin-associates-${uniqueId}`;
    const nameId = orgName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
    const orgRes = await createOrganization(orgName, nameId);
    const org = orgRes.data!.createOrganization!;
    // The organization must go whatever happens below, and `deleteOrganization`
    // resolves GraphQL failures as `{ error }` — so the body runs in try/catch,
    // the deletion result is inspected, and the test's own error wins.
    let testError: unknown;
    try {
      await removeRoleFromUser(
        TestUserManager.users.globalAdmin.id,
        org.roleSet.id,
        RoleName.Admin
      );
      // Keep an OWNER so the organization is not orphaned — owners are
      // irrelevant to the zero-ADMIN count.
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

      // "nobody gets an in-app row": the escalation mail has landed, so the
      // dispatch that would have written in-app rows has completed. Neither the
      // remaining owner nor the applicant may hold an application row for THIS
      // organization (scoped by organization id — both personas collect rows of
      // this type from other organizations the suite touches).
      const inAppApplicationRowsFor = async (userRole: TestUser) => {
        const rows = await inAppNotificationsFor(userRole, [
          NotificationEvent.OrganizationAdminAssociateApplication,
        ]);
        return (rows?.inAppNotifications ?? []).filter(
          n => n.payload?.organization?.id === org.id
        );
      };
      expect(await inAppApplicationRowsFor(TestUser.QA_USER)).toEqual([]);
      expect(await inAppApplicationRowsFor(TestUser.SUBSPACE_MEMBER)).toEqual(
        []
      );
    } catch (error) {
      testError = error;
    }
    const deletion = await deleteOrganization(org.id);
    if (testError) throw testError;
    if (deletion?.error) {
      throw new Error(
        `zero-admin organization ${org.id} was not torn down: ${JSON.stringify(deletion.error)}`
      );
    }
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
      // The positive control: without it, a pipeline that sends NOTHING passes
      // both negatives below on an empty mailbox. Exactly two "applied" mails,
      // one per unmuted admin.
      const appliedMails = mailItems.filter((m: any) =>
        /applied to associate/i.test(m.subject ?? '')
      );
      expect(appliedMails, mailboxSummary(mailItems)).toHaveLength(2);
      for (const admin of [
        TestUserManager.users.organizationAdmin,
        TestUserManager.users.subspaceAdmin,
      ]) {
        expect(
          appliedMails.filter((m: any) => m.toAddresses?.includes(admin.email)),
          `applied mail for ${admin.email}`
        ).toHaveLength(1);
      }
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

      // Quiet-period assertion: poll for the full delivery bound and return
      // early the moment an invitee-addressed mail lands, so the `0` below
      // fails as soon as the suppression breaks — and can only pass when the
      // inbox stayed clean of such mail for the whole window.
      const toInvitee = (m: any) =>
        m.toAddresses?.includes(TestUserManager.users.subsubspaceMember.email);
      const [mailItems] = await waitForMailsWhere(
        items => items.some(toInvitee),
        { timeout: 18_000 }
      );
      expect(mailItems.filter(toInvitee)).toHaveLength(0);
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
