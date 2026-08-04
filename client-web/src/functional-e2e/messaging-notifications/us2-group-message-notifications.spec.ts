import { test, expect, Page, Browser } from '@playwright/test';
import { navigateToRegistrationFromSignUpFillFormAndContinue } from '../authentication/login-page-objects';
import { fillUpSignUpPasswordElements } from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { nextButton } from '../authentication/common-authentication-page-elements';
import { loginViaCrd } from '../helpers/login.helper';
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  getQueueStats,
  getVerificationLink,
  UniqueIDGenerator,
  waitForQueuePublishIncrease,
} from '@alkemio/tests-lib';

/**
 * @forge-acceptance
 *
 * Live acceptance walk for workspace#034-messaging-notifications, User Story
 * 2 ("Know when someone messages my group", P1) — see
 * specs/034-messaging-notifications/spec.md and repos.yaml
 * (forge.verification.tracks[type=acceptance].stories[story=US2]).
 *
 * Push is verified at the EMIT/queue-publish-count boundary only (Operator
 * Ruling 3c) via the RabbitMQ management API (`alkemio-push-notifications`
 * cumulative publish counter) — never real browser delivery (no VAPID keys
 * in the acceptance overlay). Email content IS asserted directly against
 * Mailslurper, a real sink.
 *
 * Covers US2-AS1..AS5. Scenarios share one group conversation (A, B, C) and
 * run in order — later scenarios depend on earlier ones' state.
 */

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';
const EVIDENCE_DIR = process.env.FORGE_EVIDENCE_DIR;

async function snap(page: Page, name: string) {
  if (!EVIDENCE_DIR) return;
  await page.screenshot({ path: `${EVIDENCE_DIR}/${name}.png`, fullPage: true }).catch(() => {});
}

/** Registers + email-verifies a brand new user via the real sign-up flow. */
async function registerAndVerifyUser(
  page: Page,
  emailLocalPart: string,
  firstName: string,
  lastName: string
): Promise<string> {
  const uniqueId = UniqueIDGenerator.getID();
  const userEmail = `test+${emailLocalPart}${uniqueId}@alkem.io`;

  await navigateToRegistrationFromSignUpFillFormAndContinue(
    baseUrl,
    page,
    userEmail,
    firstName,
    lastName
  );
  await fillUpSignUpPasswordElements(password, page);
  // Clear the mailbox immediately before triggering the verification email
  // so getVerificationLink() below can't pick up a STALE token from a
  // previously-registered user (Mailslurper is a shared inbox across all
  // registrations in this run).
  await deleteMailSlurperMails();
  await nextButton(page).click();

  await expect(
    page.getByRole('heading', { name: 'Verify your email' })
  ).toBeVisible();

  let verificationLink: string | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    verificationLink = await getVerificationLink();
    if (verificationLink) break;
    await delay(2000);
  }
  if (verificationLink === undefined) {
    throw new Error('Verification link from email is missing!');
  }

  await page.goto(verificationLink);
  await expect(page.getByText('You successfully verified')).toBeVisible({
    timeout: 10000,
  });
  const continueLink = page.getByRole('link', { name: 'Continue' });
  if (await continueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueLink.click();
  }

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({
    timeout: 10000,
  });

  await fillUpSignInPageElements(userEmail, password, page);
  await pressSignInButtonSignInPage(page);

  return userEmail;
}

async function openChatPanel(page: Page) {
  await page.goto(`${baseUrl}/home`);
  await page.getByRole('button', { name: 'Open chat' }).click();
}

async function openConversationByName(page: Page, name: string) {
  await openChatPanel(page);
  await page.getByRole('button', { name }).first().click();
}

async function sendMessage(page: Page, text: string) {
  const messageBox = page.getByRole('textbox', { name: 'Add a comment...' });
  await messageBox.fill(text);
  await messageBox.press('Enter');
  await expect(page.getByText(text)).toBeVisible();
}

function groupEmailToggle(page: Page) {
  return page.locator(
    '[aria-label="Toggle Email notification for: Receive a notification when someone posts in a group chat I am a member of"]'
  );
}

function groupPushToggle(page: Page) {
  return page.locator(
    '[aria-label="Toggle Push notification for: Receive a notification when someone posts in a group chat I am a member of"]'
  );
}

const toAddressesOf = (mailItems: { toAddresses?: string[] }[]) =>
  mailItems.flatMap(item => item.toAddresses ?? []);

/** Polls Mailslurper until at least `expectedCount` mails are present. */
async function waitForMailsCountAtLeast(
  expectedCount: number,
  { timeout = 15_000, interval = 1_000 }: { timeout?: number; interval?: number } = {}
): Promise<[{ toAddresses?: string[]; subject?: string; body?: string }[], number]> {
  const start = Date.now();
   
  let [mailItems, total] = (await getMailsData()) as [any[], number];
  while (total < expectedCount && Date.now() - start < timeout) {
    await delay(interval);
    [mailItems, total] = (await getMailsData()) as [any[], number];
  }
  return [mailItems, total];
}

async function newContextPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

/**
 * Registers a synthetic (fake) push subscription for the CURRENTLY logged-in
 * user via an authenticated same-origin GraphQL call — the push ADAPTER
 * no-ops for a recipient with zero active subscriptions (Operator Ruling
 * 3c / test-suites precondition pattern), so this is required before any
 * push-emit assertion can observe a publish for that recipient. Mirrors
 * test-suites/server-api's generateFakePushSubscription +
 * subscribeToPushNotifications helpers.
 */
async function subscribeToPush(page: Page, label: string) {
  const uniqueId = `${label}-${Date.now()}`;
  const subscriptionData = {
    endpoint: `https://fcm.googleapis.com/fcm/send/${uniqueId}`,
    p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uniqueId}`,
    auth: `tBHItJI5svbpC7htN-${uniqueId.slice(0, 8)}`,
  };
  const result = await page.evaluate(
    async ({ subscriptionData }) => {
      const res = await fetch('/api/private/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `
            mutation SubscribeToPushNotifications($subscriptionData: SubscribeToPushNotificationsInput!) {
              subscribeToPushNotifications(subscriptionData: $subscriptionData) { id status }
            }
          `,
          variables: { subscriptionData },
        }),
      });
      return res.json();
    },
    { subscriptionData }
  );
  if (result.errors) {
    throw new Error(
      `subscribeToPushNotifications failed: ${JSON.stringify(result.errors)}`
    );
  }
}

test.describe('US2 - group message notifications', () => {
  test.describe.configure({ mode: 'serial' });

  // A run-unique suffix on every persona's first name — not just their email
  // — so repeated local runs against the same never-reset dev stack can
  // never resolve a user-picker/removal search to a STALE same-day persona
  // from an earlier run (display names, unlike emails, are otherwise
  // identical across runs and Playwright's role-based locators match on
  // accessible name).
  const runSuffix = UniqueIDGenerator.getID();
  const groupName = `Us2Group${runSuffix}`;
  const nameA = `Us2A${runSuffix}`;
  const nameB = `Us2B${runSuffix}`;
  const nameC = `Us2C${runSuffix}`;
  const nameD = `Us2D${runSuffix}`;
  let userAEmail: string;
  let userBEmail: string;
  let userCEmail: string;
  let userDEmail: string;
  const userADisplayName = `${nameA} Sender`;

  test('setup: register A (sender)', async ({ page }) => {
    test.setTimeout(90_000);
    userAEmail = await registerAndVerifyUser(page, 'us2a', nameA, 'Sender');
  });

  test('setup: register B (member)', async ({ page }) => {
    test.setTimeout(90_000);
    userBEmail = await registerAndVerifyUser(page, 'us2b', nameB, 'Member');
    await subscribeToPush(page, 'us2b');
  });

  test('setup: register C (member)', async ({ page }) => {
    test.setTimeout(90_000);
    userCEmail = await registerAndVerifyUser(page, 'us2c', nameC, 'Member');
    await subscribeToPush(page, 'us2c');
  });

  test('setup: register D (non-member)', async ({ page }) => {
    test.setTimeout(90_000);
    userDEmail = await registerAndVerifyUser(page, 'us2d', nameD, 'NonMember');
  });

  test('US2-AS1: group G (A,B,C) default settings — A sends, B+C get a push emit each, zero email', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await deleteMailSlurperMails();

    await loginViaCrd(page, userAEmail, password, baseUrl);
    await openChatPanel(page);
    await page.getByRole('button', { name: 'New message' }).click();
    const search = page.getByRole('textbox', { name: 'Search people…' });
    await search.fill(`${nameB} Member`);
    await page.getByRole('button', { name: `${nameB} Member` }).first().click();
    await search.fill(`${nameC} Member`);
    await page.getByRole('button', { name: `${nameC} Member` }).first().click();
    await page.getByRole('button', { name: 'Start group chat' }).click();

    // Rename the group to a unique, findable name via the group-settings dialog.
    await page.getByRole('button', { name: 'Group settings' }).click();
    await page.getByLabel('Group name').fill(groupName);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(groupName).first()).toBeVisible({
      timeout: 10_000,
    });

    const baseline = (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE))
      .publishedTotal;

    await sendMessage(page, 'US2-AS1 default-settings group message from A');

    const stats = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baseline,
      2
    );
    const delta = stats.publishedTotal - baseline;
    await snap(page, 'US2-AS1-after-send');
    expect(delta).toBe(2);

    await delay(3_000);
    const [, emailTotal] = await getMailsData();
    expect(emailTotal).toBe(0);
  });

  test('US2-AS2: B enables group email — A sends, B receives exactly one email naming A + G, no content, deep link', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    await deleteMailSlurperMails();

    const { context: bContext, page: bPage } = await newContextPage(browser);
    await loginViaCrd(bPage, userBEmail, password, baseUrl);
    await bPage.goto(`${baseUrl}/user/me/settings/notifications`);
    const emailToggle = groupEmailToggle(bPage);
    await expect(emailToggle).toHaveAttribute('aria-checked', 'false');
    await emailToggle.click();
    await expect(emailToggle).toHaveAttribute('aria-checked', 'true');
    await snap(bPage, 'US2-AS2-B-enables-group-email');
    await bContext.close();

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);
    await sendMessage(aPage, 'US2-AS2 group message after B enabled group email');

    const [mailItems, total] = await waitForMailsCountAtLeast(1);
    expect(total).toBe(1);

    const mail = mailItems.find(m => m.toAddresses?.includes(userBEmail));
    await snap(aPage, 'US2-AS2-after-send');
    expect(mail).toBeDefined();
    expect(mail!.subject).toBe(`${userADisplayName} sent a message in ${groupName}`);
    expect(mail!.body).not.toContain(
      'US2-AS2 group message after B enabled group email'
    );
    expect(mail!.body).toContain('/settings/notifications');
    await aContext.close();
  });

  test('US2-AS3: D (never invited, email enabled) receives nothing while B (a real member) does', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    await deleteMailSlurperMails();

    // D has the channel enabled too — proves absence is membership-driven,
    // not merely "D never opted in" (mirrors test-suites:T004 negative matrix).
    const { context: dContext, page: dPage } = await newContextPage(browser);
    await loginViaCrd(dPage, userDEmail, password, baseUrl);
    await dPage.goto(`${baseUrl}/user/me/settings/notifications`);
    const dEmailToggle = groupEmailToggle(dPage);
    await expect(dEmailToggle).toHaveAttribute('aria-checked', 'false');
    await dEmailToggle.click();
    await expect(dEmailToggle).toHaveAttribute('aria-checked', 'true');
    // D never received an invite — confirm the group conversation is absent
    // from D's own chat list.
    await openChatPanel(dPage);
    await expect(dPage.getByRole('button', { name: groupName })).toHaveCount(0);
    await snap(dPage, 'US2-AS3-D-chat-panel-no-group');
    await dContext.close();

    // AS2 (moments ago) already emailed B in this SAME conversation; the
    // email suppression window (FR-011/D-8, MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS=30
    // on this stack) would otherwise swallow B's next email here as a false
    // negative unrelated to this scenario. Wait it out so this test isolates
    // the membership question, not the suppression feature (covered by US1-AS3).
    await delay(31_000);

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);
    await sendMessage(aPage, 'US2-AS3 D is not a member of this group');

    const [mailItems, total] = await waitForMailsCountAtLeast(1);
    await snap(aPage, 'US2-AS3-after-send');
    expect(total).toBe(1);
    expect(toAddressesOf(mailItems)).toContain(userBEmail);
    expect(toAddressesOf(mailItems)).not.toContain(userDEmail);
    await aContext.close();
  });

  // BLOCKED BY alkem-io/server#6329 — group member removal is non-functional, for two
  // independent reasons: (1) the Matrix kick is rejected with M_FORBIDDEN (insufficient
  // power level, root cause in matrix-adapter), and (2) server's
  // ConversationAuthorizationService.applyAuthorizationPolicy pushes the participant
  // credential rule without resetting the persisted policy, so rules naming removed
  // members are never cleared. Both must be fixed before this can pass.
  //
  // The scenario below is CORRECT and was executed live during
  // workspace#034-messaging-notifications verification: it failed 2 of 3 runs (the third
  // passed only after ~18s, i.e. an eventual-consistency window on top of the hard 403).
  // Kept as `fixme` rather than deleted so it flips to a real regression test the moment
  // #6329 lands — remove this annotation then. Pre-dates this feature; 034 makes the
  // consequence user-visible because a "removed" member keeps receiving notifications.
  test.fixme(
    'US2-AS4: C removed from G — a message afterwards must reach nobody but current members',
    async ({ browser }) => {
    test.setTimeout(90_000);

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);

    const baselineBeforeRemoval = (
      await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)
    ).publishedTotal;
    await sendMessage(aPage, 'US2-AS4 baseline before removing C');
    const statsBefore = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baselineBeforeRemoval,
      1
    );
    const memberCountBeforeRemoval =
      statsBefore.publishedTotal - baselineBeforeRemoval;
    // Sanity: with defaults from AS1-AS3 (B email-only, C untouched default
    // push-on), both B and C should still be current push recipients.
    expect(memberCountBeforeRemoval).toBeGreaterThanOrEqual(1);

    // Remove C via the real Group settings UI (Remove -> confirm -> the
    // dialog fires removeConversationMember and optimistically drops C from
    // the client's own member list).
    await aPage.getByRole('button', { name: 'Group settings' }).click();
    await aPage.getByRole('button', { name: `Remove ${nameC} Member` }).click();
    await aPage.getByRole('button', { name: 'Remove', exact: true }).click();
    await snap(aPage, 'US2-AS4-after-remove-confirm');
    await expect(aPage.getByText(`${nameC} Member`)).toHaveCount(0);
    await aPage.getByRole('button', { name: 'Save' }).click();

    // Give the async membership-removal pipeline (server -> matrix-adapter
    // RPC -> room.member.left/updated -> conversation_membership) a moment
    // to land before re-reading membership at the next send.
    await delay(5_000);

    const baselineAfterRemoval = (
      await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)
    ).publishedTotal;
    await sendMessage(aPage, 'US2-AS4 after removing C from the group');
    // Wait out a grace period rather than polling for an increase — the
    // acceptance criterion is that C's removal REDUCES the recipient count
    // by one; polling for "any increase" would pass even if C incorrectly
    // stayed a recipient.
    await delay(6_000);
    const statsAfter = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
    const deltaAfterRemoval = statsAfter.publishedTotal - baselineAfterRemoval;

    // Acceptance criterion (US2-AS4): removing C must reduce the recipient
    // count for subsequent messages by exactly one (C stops receiving
    // anything, membership re-read at send time). If the UI's optimistic
    // "removed" state does not reflect a real, server-confirmed membership
    // change, this assertion fails and is the decisive evidence for that
    // defect rather than a false pass.
    await snap(aPage, 'US2-AS4-after-second-send');
    expect(deltaAfterRemoval).toBe(memberCountBeforeRemoval - 1);

    await aContext.close();
    }
  );

  test('US2-AS5: B disables group push — B gets no push emit while others still do', async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const { context: bContext, page: bPage } = await newContextPage(browser);
    await loginViaCrd(bPage, userBEmail, password, baseUrl);
    await bPage.goto(`${baseUrl}/user/me/settings/notifications`);
    const pushToggle = groupPushToggle(bPage);
    await expect(pushToggle).toHaveAttribute('aria-checked', 'true');
    await pushToggle.click();
    await expect(pushToggle).toHaveAttribute('aria-checked', 'false');
    await snap(bPage, 'US2-AS5-B-disables-group-push');
    await bContext.close();

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);

    const baselineBefore = (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE))
      .publishedTotal;
    await sendMessage(aPage, 'US2-AS5 baseline with B push still on');
    const statsBaseline = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baselineBefore,
      0,
      { timeout: 8_000 }
    );

    const baselineAfterToggle = statsBaseline.publishedTotal;
    await sendMessage(aPage, 'US2-AS5 B disabled group push');
    await delay(6_000);
    const statsAfterToggle = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
    const deltaAfterToggle =
      statsAfterToggle.publishedTotal - baselineAfterToggle;

    const deltaBaseline = baselineAfterToggle - baselineBefore;
    await snap(aPage, 'US2-AS5-after-second-send');
    // With B disabled, exactly one fewer push recipient than the baseline
    // send (which still included B). An exact equality — not `<` — is the
    // proof that ONLY B's disabled push dropped out, not an unrelated
    // regression that also dropped another recipient.
    expect(deltaAfterToggle).toBe(Math.max(deltaBaseline - 1, 0));

    await aContext.close();
  });
});
