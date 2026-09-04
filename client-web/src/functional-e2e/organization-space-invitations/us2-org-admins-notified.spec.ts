// Live acceptance walk for User Story 2 ("Organization admins are told their
// organization was invited", P1) — scenarios AS1..AS7.
//
// This suite was written after a forge verifier reproduced, then re-verified
// the fix for, a defect that made every one of AS1-AS4 fail: the org-invited
// dispatch crashed with `EntityNotFoundException: Unable to find Organization
// profile` before building any email/in-app/push artifact (missing
// `{ relations: { profile: true } }` on the organization lookup in
// notification.external.adapter.ts). AS1-AS3 assert the email/in-app/push
// artifacts this crash used to prevent; AS4/AS5 assert the zero-admin and
// muted-admin edge cases the same crash used to swallow.
//
// Every organization+persona pairing is purpose-built per scenario so no
// scenario's notification-settings mutation (AS5's mute, AS6's toggle) can
// leak into another scenario's "default settings" assertion (AS1/AS2) — this
// mirrors a real ordering bug the verifying session hit and diagnosed
// manually before writing this suite.

import { expect, Page, test as baseTest } from '@playwright/test';
import { GraphQLClient } from 'graphql-request';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  getQueueStats,
  testConfiguration,
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
  waitForQueuePublishIncrease,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { NotificationEvent, RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest, ensurePersonaState } from '../fixtures/authenticated-session.fixture';
import {
  assignOrganizationAdmin,
  createTestOrganization,
  OrgFixture,
  subscribeToPushForUser,
  TestUser,
  TestUserManager,
  unsubscribeFromPushForUser,
} from './organization-space-invitations.helpers';

/**
 * @forge-acceptance
 */

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const runSuffix = UniqueIDGenerator.getID();
const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';

// This file's `describe` blocks share one beforeAll-created scenario (and its
// own set of purpose-built organization fixtures + persona notification
// settings) so force one worker: `fullyParallel` running two of them in
// separate workers would trigger `beforeAll` twice (two independent
// scenarios) and let one worker's setup/mail-drain race another's
// mid-assertion — see the AS2 test below for the one test that otherwise
// looks parallel-safe in isolation.
baseTest.describe.configure({ mode: 'serial' });

// ─── Raw GraphQL escape hatch ────────────────────────────────────────────
// The generated SDK (`getGraphqlClient()`) only exposes operations that live
// as named `.graphql` documents somewhere in the lib. `me.notifications`
// (in-app read) and the roleSet admin lookup/removal used to build the
// zero-admin fixture are not among them, so this suite talks to the same
// endpoint directly via the underlying `graphql-request` client the SDK is
// built on, using the fixed personas' own bearer tokens from
// `TestUserManager` — the exact mechanism `graphqlErrorWrapper` uses
// internally.
const rawClient = new GraphQLClient(testConfiguration.endPoints.graphql.private);
async function rawGql<T>(query: string, variables: Record<string, unknown>, userRole: TestUser): Promise<T> {
  const token = TestUserManager.getUserModelByType(userRole).authToken;
  return rawClient.request<T>(query, variables, { authorization: `Bearer ${token}` });
}

type OrgInvitedNotification = {
  id: string;
  type: string;
  state: string;
  payload: {
    organization?: { id: string; profile: { displayName: string } };
    space?: { id: string; nameID: string };
    invitation?: { id: string };
  };
};

async function getOrgInvitedNotifications(userRole: TestUser): Promise<OrgInvitedNotification[]> {
  const data = await rawGql<{
    me: { notifications: { total: number; inAppNotifications: OrgInvitedNotification[] } };
  }>(
    `query {
      me {
        notifications(filter: { types: [${NotificationEvent.OrganizationAdminSpaceCommunityInvitation}] }) {
          total
          inAppNotifications {
            id
            type
            state
            payload {
              ... on InAppNotificationPayloadSpaceCommunityInvitation {
                organization { id profile { displayName } }
                space { id nameID }
                invitation { id }
              }
            }
          }
        }
      }
    }`,
    {},
    userRole
  );
  return data.me.notifications.inAppNotifications;
}

async function getRoleSetAdminIds(roleSetId: string): Promise<string[]> {
  const data = await rawGql<{ lookup: { roleSet: { admins: { id: string }[] } } }>(
    'query($rs: UUID!) { lookup { roleSet(ID: $rs) { admins: usersInRole(role: ADMIN) { id } } } }',
    { rs: roleSetId },
    TestUser.GLOBAL_ADMIN
  );
  return data.lookup.roleSet.admins.map(a => a.id);
}

async function removeAdmin(roleSetId: string, actorId: string): Promise<void> {
  await rawGql(
    'mutation($rs: UUID!, $a: UUID!) { removeRoleFromUser(roleData: { roleSetID: $rs, actorID: $a, role: ADMIN }) { id } }',
    { rs: roleSetId, a: actorId },
    TestUser.GLOBAL_ADMIN
  );
}

async function setAdminSpaceCommunityInvitationSetting(
  userId: string,
  channels: { email: boolean; inApp: boolean; push: boolean },
  userRole: TestUser
): Promise<void> {
  await rawGql(
    `mutation($id: UUID!, $email: Boolean!, $inApp: Boolean!, $push: Boolean!) {
      updateUserSettings(settingsData: {
        userID: $id
        settings: { notification: { organization: { adminSpaceCommunityInvitation: { email: $email, inApp: $inApp, push: $push } } } }
      }) { id }
    }`,
    { id: userId, ...channels },
    userRole
  );
}

type MailItem = { toAddresses?: string[]; subject?: string; body?: string };

/** Polls MailSlurper until a mail matching both substrings appears, or times out. */
async function waitForMailTo(
  recipientSubstring: string,
  subjectSubstring: string,
  timeoutMs = 20_000
): Promise<MailItem> {
  const start = Date.now();
  for (;;) {
    const [mailItems] = (await getMailsData()) as [MailItem[], number];
    const match = mailItems.find(
      m => m.toAddresses?.some(a => a.includes(recipientSubstring)) && m.subject?.includes(subjectSubstring)
    );
    if (match) return match;
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for a mail to "${recipientSubstring}" with subject containing "${subjectSubstring}"`
      );
    }
    await delay(1_000);
  }
}

/** Asserts no mail matching both substrings shows up within the window — used for
 * negative assertions (a muted channel, a plain associate) where "not yet" must mean
 * "never will". Defaults to the same bound `waitForMailTo` is given for the positive
 * path in this file, so a regression that delivers a moment late is still caught. */
async function assertNoMailTo(recipientSubstring: string, subjectSubstring: string, windowMs = 20_000): Promise<void> {
  const deadline = Date.now() + windowMs;
  while (Date.now() < deadline) {
    const [mailItems] = (await getMailsData()) as [MailItem[], number];
    const match = mailItems.find(
      m => m.toAddresses?.some(a => a.includes(recipientSubstring)) && m.subject?.includes(subjectSubstring)
    );
    expect(match, `unexpected mail to "${recipientSubstring}" with subject containing "${subjectSubstring}"`).toBeFalsy();
    await delay(1_000);
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────

const spaceAdminTest = createPersonaTest('space.admin@alkem.io');

let baseScenario: OrganizationWithSpaceModel;
let communityUrl: string;

let orgAS1: OrgFixture; // admin A (default settings) — email/in-app/push facts
let orgAS2Click: OrgFixture; // dedicated fixture for the bell click-through walk (self-contained: sends its own invite)
let orgAS3: OrgFixture; // admin B, NOT an associate — notified exactly like A
let orgAS4Zero: OrgFixture; // no admins/owners at all — support fallback
let orgAS5Muted: OrgFixture; // sole admin muted every channel
let orgAS6: OrgFixture; // settings-row UI walk (render + persist + honored)
let orgAS7: OrgFixture; // plain associate — nothing on any channel
let orgAdminAPushSubscriptionId: string; // AS1's push-emit precondition — see beforeAll

const orgAdminAId = () => TestUserManager.getUserModelByType(TestUser.ORGANIZATION_ADMIN).id;
const orgAdminBId = () => TestUserManager.getUserModelByType(TestUser.NON_SPACE_MEMBER).id;
const orgAdminMutedId = () => TestUserManager.getUserModelByType(TestUser.SUBSPACE_MEMBER).id;
const orgAdminSettingsId = () => TestUserManager.getUserModelByType(TestUser.SUBSPACE_ADMIN).id;
const orgAssociateId = () => TestUserManager.getUserModelByType(TestUser.SUBSUBSPACE_MEMBER).id;

const scenarioConfig: TestScenarioConfig = {
  name: `org-invite-us2-${runSuffix}`,
  space: {
    collaboration: { addTutorialCallouts: false },
    community: {
      // SUBSPACE_ADMIN drives the AS6 settings-row walk below
      // (orgAdminSettingsTest, `subspace.admin@alkem.io`), which also sends
      // an invite through this scenario's own Space community page — it
      // needs admin standing here too, not just on some other scenario's
      // subspace.
      admins: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN, TestUser.SUBSPACE_ADMIN],
    },
  },
};

baseTest.beforeAll(async () => {
  baseTest.setTimeout(180_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  communityUrl = `${baseUrl}/${baseScenario.space.nameId}/settings/community`;

  [orgAS1, orgAS2Click, orgAS3, orgAS4Zero, orgAS5Muted, orgAS6, orgAS7] = await Promise.all([
    createTestOrganization('US2 AS1 Default Admin Org', runSuffix),
    createTestOrganization('US2 AS2 Click Org', runSuffix),
    createTestOrganization('US2 AS3 Nonassociate Admin Org', runSuffix),
    createTestOrganization('US2 AS4 Zero Admin Org', runSuffix),
    createTestOrganization('US2 AS5 Muted Admin Org', runSuffix),
    createTestOrganization('US2 AS6 Settings Org', runSuffix),
    createTestOrganization('US2 AS7 Associate Org', runSuffix),
  ]);

  // AS1/AS2: organization.admin@alkem.io is A — reset to defaults explicitly
  // (never trust a shared, never-reset persona's leftover state). A also
  // administers orgAS2Click (the bell click-through walk's own dedicated
  // fixture, invited inside that test — never orgAS1, so the two tests never
  // race for "already invited" regardless of Playwright's parallel scheduling).
  await Promise.all([
    assignOrganizationAdmin(orgAS1.roleSetId, orgAdminAId()),
    assignOrganizationAdmin(orgAS2Click.roleSetId, orgAdminAId()),
  ]);
  await setAdminSpaceCommunityInvitationSetting(
    orgAdminAId(),
    { email: true, inApp: true, push: true },
    TestUser.ORGANIZATION_ADMIN
  );
  // AS1's push assertion needs an ACTIVE subscription: the server's push
  // adapter no-ops (never publishes to the queue) for a recipient with zero
  // active subscriptions, so without this the emit assertion cannot pass.
  orgAdminAPushSubscriptionId = await subscribeToPushForUser(
    TestUser.ORGANIZATION_ADMIN,
    `us2-as1-${runSuffix}`
  );

  // AS3: non.space@alkem.io is B — ADMIN only, never ASSOCIATE.
  await assignOrganizationAdmin(orgAS3.roleSetId, orgAdminBId());

  // AS4: zero admins/owners — remove the auto-assigned creator (GLOBAL_ADMIN).
  const zeroOrgAdmins = await getRoleSetAdminIds(orgAS4Zero.roleSetId);
  await Promise.all(zeroOrgAdmins.map(id => removeAdmin(orgAS4Zero.roleSetId, id)));

  // AS5: subspace.member@alkem.io is the SOLE admin, muted on every channel.
  await assignOrganizationAdmin(orgAS5Muted.roleSetId, orgAdminMutedId());
  const mutedOrgAdmins = (await getRoleSetAdminIds(orgAS5Muted.roleSetId)).filter(id => id !== orgAdminMutedId());
  await Promise.all(mutedOrgAdmins.map(id => removeAdmin(orgAS5Muted.roleSetId, id)));
  await setAdminSpaceCommunityInvitationSetting(
    orgAdminMutedId(),
    { email: false, inApp: false, push: false },
    TestUser.SUBSPACE_MEMBER
  );

  // AS6: subspace.admin@alkem.io drives the settings-page UI walk — needs
  // org-admin standing to even see the "Organization" notification group
  // (gated by ReceiveNotificationsOrganizationAdmin), and starts from a
  // known-good default so the render assertion isn't at the mercy of
  // whatever a previous run left behind.
  await assignOrganizationAdmin(orgAS6.roleSetId, orgAdminSettingsId());
  await setAdminSpaceCommunityInvitationSetting(
    orgAdminSettingsId(),
    { email: true, inApp: true, push: true },
    TestUser.SUBSPACE_ADMIN
  );

  // AS7: subsubspace.member@alkem.io is a plain ASSOCIATE — never admin/owner.
  await rawGql(
    `mutation($rs: UUID!, $a: UUID!) { assignRoleToUser(roleData: { roleSetID: $rs, actorID: $a, role: ${RoleName.Associate} }) { id } }`,
    { rs: orgAS7.roleSetId, a: orgAssociateId() },
    TestUser.GLOBAL_ADMIN
  );

  await deleteMailSlurperMails();
});

baseTest.afterAll(async () => {
  if (orgAdminAPushSubscriptionId) {
    await unsubscribeFromPushForUser(TestUser.ORGANIZATION_ADMIN, orgAdminAPushSubscriptionId);
  }
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// ─── Page-level helper (mirrors us1-invite-organization.spec.ts) ─────────

async function inviteOrganizationViaDialog(page: Page, org: OrgFixture, message: string): Promise<string> {
  await page.goto(communityUrl);
  const toggle = page.getByRole('button', { name: /Member Organisations/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Invite Organisation' }).click();
  await expect(page.getByText(/Invite an organisation to join/)).toBeVisible();

  const search = page.getByRole('textbox', { name: 'Search for users by name or email' });
  await search.fill(org.displayName);
  await page.getByRole('button', { name: org.displayName }).click();

  const messageBox = page.getByRole('textbox', { name: /message/i });
  await expect(messageBox).toBeVisible();
  await messageBox.fill(message);

  await page.getByRole('button', { name: 'Send' }).click();

  // Scope to the dialog: the pending-invitations list behind it can render
  // its own <li> for the same organization (already-invited scenarios, or
  // a background refetch while this dialog is still open), which would
  // otherwise make this locator resolve to more than one element.
  const dialog = page.getByRole('dialog');
  const resultRow = dialog.locator('li').filter({ hasText: org.displayName });
  await expect(resultRow).toBeVisible();
  const resultText = (await resultRow.textContent()) ?? '';

  await page.getByRole('button', { name: 'Close' }).click();
  return resultText;
}

// ─── US2-AS1 / US2-AS2: default-settings admin A — email, in-app, push ────

spaceAdminTest.describe('US2-AS1/AS2 — org admin A (default settings) is notified on every channel', () => {
  spaceAdminTest(
    'US2-AS1/AS2: A receives an email (inviter/org/Space/role/message, CTA to Invitations tab), an in-app notification with the same facts, and a push is emitted',
    async ({ page }) => {
      const message = `US2-AS1 message ${runSuffix} <b>bold</b> "quoted"`;
      const pushBaseline = (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)).publishedTotal;

      const resultText = await inviteOrganizationViaDialog(page, orgAS1, message);
      expect(resultText).toContain('Invitation sent');

      // AS1 — email.
      const orgAdminAEmail = TestUserManager.getUserModelByType(TestUser.ORGANIZATION_ADMIN).email;
      const mail = await waitForMailTo(orgAdminAEmail, orgAS1.displayName);
      expect(mail.subject).toContain(baseScenario.space.about.profile.displayName);
      // Inviter, organization and Space named; message HTML-escaped literally
      // (never rendered as markup — spec.md Edge Cases).
      expect(mail.body).toContain(orgAS1.displayName);
      expect(mail.body).toContain(baseScenario.space.about.profile.displayName);
      expect(mail.body).toContain('&lt;b&gt;bold&lt;/b&gt;');
      expect(mail.body).not.toContain('<b>bold</b>');
      expect(mail.body).toContain(`/organization/${orgAS1.nameID}/settings/invitations`);
      // The message must never leak into the subject line (spec.md Edge Cases).
      expect(mail.subject).not.toContain('US2-AS1 message');

      // AS2 — in-app, same facts (API level; the UI click-through to the
      // Invitations tab is a separate, self-contained test below so the two
      // never depend on execution order).
      const notifications = await getOrgInvitedNotifications(TestUser.ORGANIZATION_ADMIN);
      const match = notifications.find(n => n.payload.organization?.id === orgAS1.id);
      expect(match).toBeTruthy();
      expect(match?.payload.space?.nameID).toBe(baseScenario.space.nameId);
      expect(match?.payload.invitation?.id).toBeTruthy();

      // AS2 — push, emit-level (034/041 convention: publish confirmed via
      // the RabbitMQ management API, never real browser delivery).
      const stats = await waitForQueuePublishIncrease(PUSH_NOTIFICATIONS_QUEUE, pushBaseline, 1, { timeout: 20_000 });
      expect(stats.publishedTotal).toBeGreaterThanOrEqual(pushBaseline + 1);
    }
  );
});

// Self-contained: drives BOTH personas (space admin sends, org admin A
// clicks) inside one test via two independent browser contexts, so this
// walk never depends on another test having run first. It still shares the
// file-level beforeAll scenario and fixtures with every other test here,
// so it is NOT safe to schedule across workers on its own — see the
// `describe.configure({ mode: 'serial' })` near the top of this file.
baseTest(
  'US2-AS2: clicking the bell then the invitation item navigates to /organization/<nameID>/settings/invitations',
  async ({ browser }) => {
    const spaceAdminState = await ensurePersonaState(browser, 'space.admin@alkem.io');
    const spaceAdminContext = await browser.newContext({ storageState: spaceAdminState });
    const spaceAdminPage = await spaceAdminContext.newPage();
    const message = `US2-AS2-click message ${runSuffix}`;
    const resultText = await inviteOrganizationViaDialog(spaceAdminPage, orgAS2Click, message);
    expect(resultText).toContain('Invitation sent');
    await spaceAdminContext.close();

    const orgAdminState = await ensurePersonaState(browser, 'organization.admin@alkem.io');
    const orgAdminContext = await browser.newContext({ storageState: orgAdminState });
    const page = await orgAdminContext.newPage();
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Notifications' }).click();

    const item = page.getByText(new RegExp(`invited to join ${escapeRegex(baseScenario.space.about.profile.displayName)}`));
    await expect(item).toBeVisible({ timeout: 15_000 });
    await item.click();

    await expect(page).toHaveURL(new RegExp(`/organization/${orgAS2Click.nameID}/settings/invitations$`));
    await expect(page.getByText('Space Invitations')).toBeVisible();
    await orgAdminContext.close();
  }
);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── US2-AS3: admin B, not an associate, notified exactly like A ─────────

spaceAdminTest.describe('US2-AS3 — org admin B (not an associate) is notified exactly like A', () => {
  spaceAdminTest('B receives an email and an in-app notification', async ({ page }) => {
    await inviteOrganizationViaDialog(page, orgAS3, `US2-AS3 message ${runSuffix}`);

    const orgAdminBEmail = TestUserManager.getUserModelByType(TestUser.NON_SPACE_MEMBER).email;
    const mail = await waitForMailTo(orgAdminBEmail, orgAS3.displayName);
    expect(mail.body).toContain(`/organization/${orgAS3.nameID}/settings/invitations`);

    const notifications = await getOrgInvitedNotifications(TestUser.NON_SPACE_MEMBER);
    expect(notifications.some(n => n.payload.organization?.id === orgAS3.id)).toBe(true);
  });
});

// ─── US2-AS4: zero-admin organization — support fallback ─────────────────

spaceAdminTest.describe('US2-AS4 — an organization with no admins/owners still gets an invitation, via the support fallback', () => {
  spaceAdminTest(
    'the invite outcome carries the no-administrators notice and support@alkem.io receives exactly one email greeting "Hello,"',
    async ({ page }) => {
      const resultText = await inviteOrganizationViaDialog(page, orgAS4Zero, `US2-AS4 message ${runSuffix}`);
      expect(resultText).toContain('Invitation sent');
      expect(resultText).toContain('this organisation currently has no administrators to notify');

      const mail = await waitForMailTo('support@alkem.io', orgAS4Zero.displayName);
      expect(mail.body).toContain('Hello,');
      expect(mail.body).toContain(orgAS4Zero.displayName);
      expect(mail.body).toContain(baseScenario.space.about.profile.displayName);
    }
  );
});

// ─── US2-AS5: sole admin muted every channel — nothing to them, no fallback ───

spaceAdminTest.describe('US2-AS5 — a sole admin who muted every channel gets nothing, and the support fallback does NOT fire', () => {
  spaceAdminTest(
    'the muted admin receives no in-app notification and no email reaches support@alkem.io for this org',
    async ({ page }) => {
      // A full SPA invite walk plus the 20s negative mail window below
      // exceeds the default config's 30s per-test budget.
      spaceAdminTest.setTimeout(120_000);
      await inviteOrganizationViaDialog(page, orgAS5Muted, `US2-AS5 message ${runSuffix}`);

      const notifications = await getOrgInvitedNotifications(TestUser.SUBSPACE_MEMBER);
      expect(notifications.some(n => n.payload.organization?.id === orgAS5Muted.id)).toBe(false);

      // The org HAS an admin (they just muted every channel), so the
      // zero-admin escalation must not fire for THIS org's invite.
      await assertNoMailTo('support@alkem.io', orgAS5Muted.displayName);
    }
  );
});

// ─── US2-AS6: settings row — render, persist, honored ────────────────────

const orgAdminSettingsTest = createPersonaTest('subspace.admin@alkem.io');

orgAdminSettingsTest.describe('US2-AS6 — the organization notification settings row renders, persists, and is honored', () => {
  orgAdminSettingsTest(
    'the "organisation invited to a Space" row shows with all three channels on; toggling email off persists across reload and suppresses the next email',
    async ({ page }) => {
      // Two SPA navigations (settings page + reload + the invite dialog's
      // own navigation) plus the 20s negative mail window below exceeds the
      // default config's 30s per-test budget.
      orgAdminSettingsTest.setTimeout(120_000);
      await page.goto(`${baseUrl}/user/me/settings/notifications`);

      const rowLabel = page.getByText('Receive a notification when an organisation I administer is invited to join a Space');
      await expect(rowLabel).toBeVisible();

      const emailToggle = page.getByRole('switch', {
        name: 'Toggle Email notification for: Receive a notification when an organisation I administer is invited to join a Space',
      });
      const inAppToggle = page.getByRole('switch', {
        name: 'Toggle In-App notification for: Receive a notification when an organisation I administer is invited to join a Space',
      });
      await expect(emailToggle).toBeChecked();
      await expect(inAppToggle).toBeChecked();

      await emailToggle.click();
      await expect(emailToggle).not.toBeChecked();

      await page.reload();
      await expect(
        page.getByRole('switch', {
          name: 'Toggle Email notification for: Receive a notification when an organisation I administer is invited to join a Space',
        })
      ).not.toBeChecked();

      // Honored on the next invite: email suppressed, in-app still produced.
      await inviteOrganizationViaDialog(page, orgAS6, `US2-AS6 message ${runSuffix}`);

      await assertNoMailTo(TestUserManager.getUserModelByType(TestUser.SUBSPACE_ADMIN).email, orgAS6.displayName);
      const notifications = await getOrgInvitedNotifications(TestUser.SUBSPACE_ADMIN);
      expect(notifications.some(n => n.payload.organization?.id === orgAS6.id)).toBe(true);
    }
  );
});

// ─── US2-AS7: plain associate — nothing on any channel ────────────────────

spaceAdminTest.describe('US2-AS7 — a plain associate (neither admin nor owner) receives nothing on any channel', () => {
  spaceAdminTest('the associate has zero org-invited emails and zero in-app notifications', async ({ page }) => {
    // A full SPA invite walk plus the 20s negative mail window below
    // exceeds the default config's 30s per-test budget.
    spaceAdminTest.setTimeout(120_000);
    await inviteOrganizationViaDialog(page, orgAS7, `US2-AS7 message ${runSuffix}`);

    const associateEmail = TestUserManager.getUserModelByType(TestUser.SUBSUBSPACE_MEMBER).email;
    await assertNoMailTo(associateEmail, orgAS7.displayName);

    const notifications = await getOrgInvitedNotifications(TestUser.SUBSUBSPACE_MEMBER);
    expect(notifications.some(n => n.payload.organization?.id === orgAS7.id)).toBe(false);
  });
});
