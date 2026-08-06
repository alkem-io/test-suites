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
  digestTestTimeoutMs,
  digestWindow,
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
 *
 * TIMING (Operator Ruling R4). Nothing is sent on message arrival. Each
 * channel is debounced on its own per-(recipient, channel, kind) track and
 * dispatched by a sweep once that track's quiet period has elapsed, so every
 * wait here derives from `digestWindow(...)` — including the per-test
 * timeouts, which the previous revision hard-coded at 90s and which therefore
 * did NOT scale with the window they were waiting on. The literal
 * `delay(31_000)` that used to sit in AS3 (waiting out a 30s email
 * suppression window that R4 deleted) is gone with it.
 *
 * Nobody reads the group conversation during this walk, so no digest is ever
 * cancelled — the cancellation path is US5's, covered by the server-api
 * read-state it-spec.
 */

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';
const EVIDENCE_DIR = process.env.FORGE_EVIDENCE_DIR;

// The two group tracks this walk exercises. Registration/setup steps keep a
// fixed timeout (they wait on Kratos and the mail catcher, not on a digest).
const groupPush = digestWindow('push', 'group');
const groupEmail = digestWindow('email', 'group');
const SETUP_TIMEOUT_MS = 90_000;

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
  let userDEmail: string;
  // A's display name is no longer asserted on: an R4 group digest names the
  // CONVERSATION, not the sender (data-model 9.1), so the subject carries G's
  // name rather than A's.

  test('setup: register A (sender)', async ({ page }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    userAEmail = await registerAndVerifyUser(page, 'us2a', nameA, 'Sender');
  });

  test('setup: register B (member)', async ({ page }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    userBEmail = await registerAndVerifyUser(page, 'us2b', nameB, 'Member');
    await subscribeToPush(page, 'us2b');
  });

  test('setup: register C (member)', async ({ page }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    await registerAndVerifyUser(page, 'us2c', nameC, 'Member');
    await subscribeToPush(page, 'us2c');
  });

  test('setup: register D (non-member)', async ({ page }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    userDEmail = await registerAndVerifyUser(page, 'us2d', nameD, 'NonMember');
  });

  test('US2-AS1: group G (A,B,C) default settings — A sends, B+C get a push emit each, zero email', async ({
    page,
  }) => {
    test.setTimeout(digestTestTimeoutMs([groupPush, groupEmail]));
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

    // B and C each have their own `push:group` track, but the same message
    // armed both, so both flush within one quiet period. Poll bound covers
    // `push:group` quiet + sweep + settle — the pushes are debounced, not
    // immediate.
    const stats = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baseline,
      2,
      { timeout: groupPush.quietGraceMs }
    );
    const delta = stats.publishedTotal - baseline;
    await snap(page, 'US2-AS1-after-send');
    expect(delta).toBe(2);

    // NEGATIVE half — "zero email" must outlast the EMAIL track, the slowest
    // of the four. Grace covers `email:group` at its MAX-DELAY bound; the old
    // literal 3s would have passed on a build that emailed by default,
    // because that email would not have been dispatched yet either.
    await delay(groupEmail.maxDelayGraceMs);
    const [, emailTotal] = await getMailsData();
    expect(emailTotal).toBe(0);
  });

  test('US2-AS2: B enables group email — A sends, B receives exactly one email naming G, no content, deep link', async ({
    browser,
  }) => {
    test.setTimeout(digestTestTimeoutMs(groupEmail));
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

    // Poll bound covers `email:group` quiet + sweep + settle.
    const [mailItems, total] = await waitForMailsCountAtLeast(1, {
      timeout: groupEmail.quietGraceMs,
    });
    expect(total).toBe(1);

    const mail = mailItems.find(m => m.toAddresses?.includes(userBEmail));
    await snap(aPage, 'US2-AS2-after-send');
    expect(mail).toBeDefined();
    // R4 group digests report CONVERSATIONS, not senders — a digest can span
    // several groups, so there is no single sender to name (data-model 9.1).
    // The count is not pinned: nobody reads the group during this serial walk,
    // so B's unread total also carries AS1's message, and a digest reports
    // what is still unread at fire time. What US2-AS2 claims is that the
    // subject names G.
    expect(mail!.subject).toMatch(
      new RegExp(`^(New message in ${groupName}|\\d+ new messages in ${groupName})$`)
    );
    expect(mail!.body).not.toContain(
      'US2-AS2 group message after B enabled group email'
    );
    expect(mail!.body).toContain('/settings/notifications');
    await aContext.close();
  });

  test('US2-AS3: D (never invited, email enabled) receives nothing while B (a real member) does', async ({
    browser,
  }) => {
    test.setTimeout(digestTestTimeoutMs(groupEmail, { cycles: 3 }));
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

    // The `delay(31_000)` that used to sit here waited out a 30s email
    // suppression window that R4 deleted (D-8). The reason to wait now is
    // different and derived, not literal: AS2's send armed B's `email:group`
    // track, and if that digest were still pending, this scenario's send would
    // simply reset the same debounce and produce ONE email covering both — an
    // outcome the count assertion below could not distinguish from a genuine
    // failure. Grace covers `email:group` at its MAX-DELAY bound, so AS2's
    // digest has provably flushed and this scenario starts from a clean track.
    await delay(groupEmail.maxDelayGraceMs);
    await deleteMailSlurperMails();

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);
    await sendMessage(aPage, 'US2-AS3 D is not a member of this group');

    // Poll bound covers `email:group` quiet + sweep + settle for B's digest.
    const [, total] = await waitForMailsCountAtLeast(1, {
      timeout: groupEmail.quietGraceMs,
    });
    expect(total).toBe(1);

    // NEGATIVE — D's absence is the point of this scenario. If D were wrongly
    // armed, D's digest would be on D's OWN track and could land well after
    // B's. Grace covers `email:group` at its MAX-DELAY bound before the
    // address list is read; reading it at B's arrival would have proven
    // nothing about D.
    await delay(groupEmail.maxDelayGraceMs);
    const [mailItems, settledTotal] = await getMailsData();
    await snap(aPage, 'US2-AS3-after-send');
    expect(settledTotal).toBe(1);
    expect(toAddressesOf(mailItems)).toContain(userBEmail);
    expect(toAddressesOf(mailItems)).not.toContain(userDEmail);
    await aContext.close();
  });

  // Previously BLOCKED BY alkem-io/server#6329 (test.fixme) — group member removal
  // used to be non-functional for two independent reasons: (1) the Matrix kick is
  // rejected with M_FORBIDDEN (insufficient power level, root cause in
  // matrix-adapter, still open as of this run), and (2) ConversationService.removeMember
  // used to throw on that rejection instead of keeping Alkemio's own membership
  // authoritative.
  //
  // FIXED in this branch (sec-server-11): ConversationService.removeMember now
  // catches a rejected Matrix kick, logs the Matrix-side divergence for manual
  // reconciliation, and proceeds to delete the LOCAL conversation_membership row
  // regardless — notification recipients are re-read from that table at send
  // time (D-13), so the removal takes effect for every channel on the very next
  // message even though the Matrix room membership itself is now known to
  // diverge (tracked separately, out of scope for this repo, see
  // docs/matrix-admin-reflection.md Finding 1 and alkem-io/server#6329). Live
  // re-verification 2026-08-04 (workspace#034-messaging-notifications, US2):
  // removeConversationMember resolves without a GraphQL error, C disappears
  // from both the group's member list AND C's own chat list, and the
  // recipient-resolution log for the next USER_CONVERSATION_MESSAGE_GROUP event
  // no longer includes C's actor id on any channel.
  //
  // SCOPE WARNING — a green run here means "we stopped NOTIFYING them", NOT "we
  // revoked their ACCESS". Two revocation gaps remain open under #6329:
  //   (1) Matrix room membership still diverges — C's Matrix session can still reach
  //       the room;
  //   (2) ConversationAuthorizationService.applyAuthorizationPolicy pushes the
  //       participant credential rule onto the persisted policy without calling
  //       reset() first, so stale rules naming removed members are never cleared and
  //       keep granting READ + CONTRIBUTE on the conversation.
  // Do not widen this test — or cite it — as evidence that removal revokes access.
  test('US2-AS4: C removed from G — a message afterwards must reach nobody but current members', async ({
    browser,
  }) => {
    test.setTimeout(digestTestTimeoutMs(groupPush, { cycles: 3 }));

    const { context: aContext, page: aPage } = await newContextPage(browser);
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openConversationByName(aPage, groupName);

    const baselineBeforeRemoval = (
      await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)
    ).publishedTotal;
    await sendMessage(aPage, 'US2-AS4 baseline before removing C');
    // Poll bound covers `push:group` quiet + sweep + settle. Each recipient
    // has their own track but the same message armed both, so they flush on
    // the same sweep tick — the extra settle below is what turns "at least
    // one arrived" into a STABLE recipient count. Without it the baseline
    // could be read as 1 while a second publish was microseconds away, and
    // the post-removal assertion would then be comparing against the wrong
    // number.
    await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baselineBeforeRemoval,
      1,
      { timeout: groupPush.quietGraceMs }
    );
    await delay(groupPush.settleMs);
    const memberCountBeforeRemoval =
      (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)).publishedTotal -
      baselineBeforeRemoval;
    // Sanity: with defaults from AS1-AS3 (B email-only, C untouched default
    // push-on), C should still be a current push recipient.
    expect(memberCountBeforeRemoval).toBeGreaterThanOrEqual(1);

    // Remove C via the real Group settings UI (Remove -> confirm). The
    // mutation must resolve without throwing even though the underlying
    // Matrix kick is rejected (M_FORBIDDEN) — sec-server-11 makes Alkemio's
    // own membership authoritative in that case rather than surfacing the
    // Matrix-side failure to the caller.
    await aPage.getByRole('button', { name: 'Group settings' }).click();
    await aPage.getByRole('button', { name: `Remove ${nameC} Member` }).click();
    await aPage.getByRole('button', { name: 'Remove', exact: true }).click();
    await snap(aPage, 'US2-AS4-after-remove-confirm');
    await expect(aPage.getByText(`${nameC} Member`)).toHaveCount(0);
    await aPage.getByRole('button', { name: 'Save' }).click();

    // Give the async membership-removal pipeline a moment to land before
    // re-reading membership at the next send (the local-authoritative path
    // is synchronous with the mutation, but leave headroom for the dialog
    // to close and the client cache to settle).
    await delay(3_000);

    const baselineAfterRemoval = (
      await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)
    ).publishedTotal;
    await sendMessage(aPage, 'US2-AS4 after removing C from the group');
    // Wait out a grace period rather than polling for an increase — the
    // acceptance criterion is that C's removal REDUCES the recipient count
    // by one; polling for "any increase" would pass even if C incorrectly
    // stayed a recipient. Grace covers `push:group` at its MAX-DELAY bound:
    // a push for C would be debounced before it ever reached the queue, so
    // the previous literal 6s could have read the counter while C's wrongly
    // armed dispatch was still comfortably pending.
    await delay(groupPush.maxDelayGraceMs);
    const statsAfter = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
    const deltaAfterRemoval = statsAfter.publishedTotal - baselineAfterRemoval;

    // Acceptance criterion (US2-AS4): removing C must reduce the recipient
    // count for subsequent messages by exactly one (C stops receiving
    // anything, membership re-read at send time).
    await snap(aPage, 'US2-AS4-after-second-send');
    expect(deltaAfterRemoval).toBe(memberCountBeforeRemoval - 1);

    await aContext.close();
  });

  test('US2-AS5: B disables group push — B gets no push emit (the comparative half lives in the server-api negative matrix)', async ({
    browser,
  }) => {
    test.setTimeout(digestTestTimeoutMs(groupPush, { cycles: 3 }));

    // SCOPE NOTE (pre-existing, made explicit while retiming). By this point
    // AS4 has removed C, so the group's only non-sender member is B. The
    // "while others still do" half of US2-AS5 therefore cannot be shown here
    // — there is no other member left to receive anything, and the baseline
    // delta below is expected to be 0. What this step genuinely proves is
    // that B, having disabled group push, receives nothing. The comparative
    // half (B disabled gets 0 while C on defaults still gets 1, asserted as
    // an EXACT delta of 1 rather than 2) lives in the server-api negative
    // matrix, which keeps two members precisely so the comparison is real.
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
    await sendMessage(aPage, 'US2-AS5 first send after B disabled group push');
    // Grace covers `push:group` at its MAX-DELAY bound. This is a NEGATIVE
    // measurement — the expectation is that no push is produced at all — so a
    // poll would have nothing to wait for, and the previous code's
    // `waitForQueuePublishIncrease(..., 0, { timeout: 8_000 })` returned
    // immediately without waiting at all (an increase of 0 is satisfied by
    // the baseline itself). It therefore reported "no push" before the
    // pipeline had even had a chance to debounce one.
    await delay(groupPush.maxDelayGraceMs);
    const statsFirst = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
    const deltaFirst = statsFirst.publishedTotal - baselineBefore;

    const baselineSecond = statsFirst.publishedTotal;
    await sendMessage(aPage, 'US2-AS5 second send, B still disabled');
    await delay(groupPush.maxDelayGraceMs);
    const statsSecond = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
    const deltaSecond = statsSecond.publishedTotal - baselineSecond;

    await snap(aPage, 'US2-AS5-after-second-send');
    // B is the only non-sender member left (see the scope note above), and B
    // has group push disabled — so BOTH sends must produce exactly zero push
    // publishes, measured past the point at which a debounced push would have
    // been dispatched.
    expect(deltaFirst).toBe(0);
    expect(deltaSecond).toBe(0);

    await aContext.close();
  });
});
