import { test, expect, Page, Browser } from '@playwright/test';
import { loginViaCrd } from '../helpers/login.helper';
import {
  delay,
  deleteMailSlurperMails,
  digestTestTimeoutMs,
  digestWindow,
  getMailsData,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  baseUrl,
  newContextPage,
  openChatPanel,
  password,
  pushPublishedTotal,
  registerAndVerifyUser,
  sendMessage,
  SETUP_TIMEOUT_MS,
  settledPushDelta,
  subscribeToPush,
  toAddressesOf,
  waitForMailsCountAtLeast,
} from './messaging.helpers';

/**
 * @forge-acceptance
 *
 * Live acceptance walk for workspace#034-messaging-notifications, User Story
 * 1 ("Know when someone messages me one-on-one", P1) — see
 * specs/034-messaging-notifications/spec.md and repos.yaml
 * (forge.verification.tracks[type=acceptance].stories[story=US1]).
 *
 * Push is verified at the EMIT/queue-publish-count boundary only (Operator
 * Ruling 3c) via the RabbitMQ management API (`alkemio-push-notifications`
 * cumulative publish counter) — never real browser delivery (no VAPID keys
 * in the acceptance overlay). Email content IS asserted directly against
 * Mailslurper, a real sink. Both A and B are given a synthetic push
 * subscription up front so US1-AS4's sender-exclusion check is a real
 * candidate-list assertion (push delta stays 1, never 2) rather than an
 * accidental "nobody has a subscription anyway" pass.
 *
 * Covers US1-AS1..AS5. Scenarios share one 1:1 conversation (A, B) and run
 * in order — later scenarios depend on earlier ones' state (in particular
 * the enabled-email state from AS2 carrying into AS4/AS5).
 *
 * TIMING (Operator Ruling R4). Nothing is sent on message arrival. Each
 * channel is debounced on its own per-(recipient, channel, kind) track and
 * dispatched by a sweep once that track's quiet period has elapsed, so every
 * wait here derives from `digestWindow(...)` — including the per-test
 * timeouts, which the previous revision hard-coded at 60s/90s and which
 * therefore did NOT scale with the window they were waiting on. The stack
 * must export the same nine MESSAGING_DIGEST_* variables to both the server
 * and this harness (see client-web/.env.default); when they are unset the
 * harness falls back to the PRODUCTION windows rather than the short ones, so
 * a mis-provisioned stack runs slowly instead of passing vacuously.
 *
 * B never reads the conversation in this walk, so no digest is ever cancelled
 * — the cancellation path is US5's, covered by the server-api read-state
 * it-spec.
 *
 * Personas are registered INLINE through the real sign-up flow rather than
 * reusing the repo's session-based storage-state fixtures in `.auth/` — see
 * `messaging.helpers.ts`, which holds that rationale and every fixture this
 * walk shares with US2/US3.
 */

// The two direct tracks this walk exercises. Registration/setup steps keep a
// fixed timeout (they wait on Kratos and the mail catcher, not on a digest);
// every notification step below derives its timeout from these.
const directPush = digestWindow('push', 'direct');
const directEmail = digestWindow('email', 'direct');

function directEmailToggle(page: Page) {
  return page.locator(
    '[aria-label="Toggle Email notification for: Receive a notification when someone sends me a direct (1:1) chat message"]'
  );
}

function directInAppToggle(page: Page) {
  return page.locator(
    '[aria-label="Toggle In-App notification for: Receive a notification when someone sends me a direct (1:1) chat message"]'
  );
}

test.describe('US1 - direct (1:1) message notifications', () => {
  test.describe.configure({ mode: 'serial' });

  // A run-unique suffix on every persona's first name — not just their email
  // — so repeated local runs against the same never-reset dev stack can never
  // resolve the user-picker search below to a STALE same-named persona from
  // an earlier run (display names, unlike emails, are otherwise identical
  // across runs, and Playwright's role-based locators match on accessible
  // name, so `.first()` would silently pick the wrong B and every email
  // assertion against `userBEmail` would then fail for an unrelated reason).
  const runSuffix = UniqueIDGenerator.getID();
  const nameA = `Us1A${runSuffix}`;
  const nameB = `Us1B${runSuffix}`;
  const userADisplayName = `${nameA} Sender`;
  const userBDisplayName = `${nameB} Recipient`;
  let userAEmail: string;
  let userBEmail: string;
  let aContext: Awaited<ReturnType<Browser['newContext']>>;
  let aPage: Page;

  test('setup: register A (sender) with a push subscription', async ({
    page,
  }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    ({ email: userAEmail } = await registerAndVerifyUser(
      page,
      'us1a',
      nameA,
      'Sender'
    ));
    await subscribeToPush(page, 'us1a');
  });

  test('setup: register B (recipient) with a push subscription', async ({
    page,
  }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    ({ email: userBEmail } = await registerAndVerifyUser(
      page,
      'us1b',
      nameB,
      'Recipient'
    ));
    await subscribeToPush(page, 'us1b');
  });

  test('setup: A starts a 1:1 conversation with B', async ({ browser }) => {
    test.setTimeout(SETUP_TIMEOUT_MS);
    ({ context: aContext, page: aPage } = await newContextPage(browser));
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openChatPanel(aPage);
    await aPage.getByRole('button', { name: 'New message' }).click();
    await aPage
      .getByRole('textbox', { name: 'Search people…' })
      .fill(userBDisplayName);
    await aPage.getByRole('button', { name: userBDisplayName }).first().click();
    await aPage.getByRole('button', { name: 'Start chat' }).click();
    await expect(aPage.getByText(userBDisplayName).first()).toBeVisible();
  });

  test('US1-AS1: default settings — A sends, B gets a push emit once the quiet period elapses, zero email', async () => {
    test.setTimeout(digestTestTimeoutMs([directPush, directEmail]));
    await deleteMailSlurperMails();

    const baseline = await pushPublishedTotal();

    await sendMessage(aPage, 'US1-AS1 default-settings direct message from A');

    // Poll bound covers `push:direct` quiet + sweep + settle — the push is
    // debounced, not immediate. The settle then covers `email:direct` at its
    // MAX-DELAY bound, which is the LONGER of the two direct tracks, so ONE
    // wait serves both halves of this scenario: the exact push delta is read
    // from a stable counter rather than at the first observation that reached
    // 1 (a second, wrong publish lands on its own recipient's track and can
    // arrive well after B's), and the "zero email" half is measured past the
    // point at which a default-on email would provably have been dispatched.
    const pushDelta = await settledPushDelta(baseline, 1, {
      pollTimeoutMs: directPush.quietGraceMs,
      settleMs: directEmail.maxDelayGraceMs,
    });
    expect(pushDelta).toBe(1);

    const [, emailTotal] = await getMailsData();
    expect(emailTotal).toBe(0);
  });

  test('US1-AS2: B enables direct email — A sends, B receives exactly one email naming A, no content, deep link, settings link', async ({
    browser,
  }) => {
    test.setTimeout(digestTestTimeoutMs(directEmail));
    await deleteMailSlurperMails();

    const { context: bContext, page: bPage } = await newContextPage(browser);
    await loginViaCrd(bPage, userBEmail, password, baseUrl);
    await bPage.goto(`${baseUrl}/user/me/settings/notifications`);

    // FR-003: the in-app cell is locked off regardless of intent — clicking
    // it must never flip its state.
    const inAppToggle = directInAppToggle(bPage);
    await expect(inAppToggle).toHaveAttribute('aria-checked', 'false');
    await inAppToggle.click({ force: true }).catch(() => {});
    await expect(inAppToggle).toHaveAttribute('aria-checked', 'false');

    const emailToggle = directEmailToggle(bPage);
    await expect(emailToggle).toHaveAttribute('aria-checked', 'false');
    await emailToggle.click();
    await expect(emailToggle).toHaveAttribute('aria-checked', 'true');
    await bContext.close();

    const probeMessage = 'US1-AS2 direct message after B enabled direct email';
    await sendMessage(aPage, probeMessage);

    // Poll bound covers `email:direct` quiet + sweep + settle; the settle then
    // re-reads at `email:direct`'s MAX-DELAY bound so "exactly one" is read
    // from a stable inbox. Without it this would only prove "at least one,
    // sampled at the first poll that saw it" — a second, wrongly-addressed
    // digest sits on its own recipient's track and can land much later.
    const [mailItems, total] = await waitForMailsCountAtLeast(1, {
      timeout: directEmail.quietGraceMs,
      settleMs: directEmail.maxDelayGraceMs,
    });
    expect(total).toBe(1);

    const mail = mailItems.find(m => m.toAddresses?.includes(userBEmail));
    expect(mail).toBeDefined();
    // Single-entry direct digest: A is the only counterpart, so A is named.
    // The COUNT is deliberately not pinned. These scenarios run serially
    // against one conversation and B never reads it, so by now B's unread
    // total also includes AS1's message — under R4 a digest reports what is
    // still unread at fire time, not what arrived since the last email. What
    // US1-AS2 actually claims is that the subject names A and no one else.
    expect(mail!.subject).toMatch(
      new RegExp(`^${userADisplayName} sent you (a message|\\d+ messages)$`)
    );
    expect(mail!.body).not.toContain(probeMessage);
    expect(mail!.body).toContain('/settings/notifications');
    // No participant email address disclosed to another participant.
    expect(mail!.body).not.toContain(userAEmail);
  });

  test('US1-AS3: a burst of 5 messages produces NOTHING during the quiet period, then exactly one digest', async () => {
    test.setTimeout(digestTestTimeoutMs(directEmail, { cycles: 3 }));
    await deleteMailSlurperMails();

    for (let i = 1; i <= 5; i++) {
      await sendMessage(aPage, `US1-AS3 burst message ${i}`);
    }

    // Assert 1 (load-bearing, and the inverse of what this step used to
    // check). The pre-R4 build emailed on the FIRST message of the burst and
    // suppressed the rest; R4 sends NOTHING until the quiet period elapses.
    // Grace stops just short of `email:direct`'s quiet period, measured from
    // the last message — a sweep can only delay a flush past that point, never
    // advance it, so any email here means the pipeline sent on arrival.
    await delay(directEmail.preFireProbeMs);
    const [, duringWindowTotal] = await getMailsData();
    expect(duringWindowTotal).toBe(0);

    // Assert 2 — one digest, once the window does elapse.
    const [, burstTotal] = await waitForMailsCountAtLeast(1, {
      timeout: directEmail.quietGraceMs,
    });
    expect(burstTotal).toBe(1);

    // Assert 3 — and only one. Settle to `email:direct`'s MAX-DELAY bound so a
    // per-message dispatch regression has every chance to reveal itself.
    await delay(directEmail.maxDelayGraceMs);
    const [, settledTotal] = await getMailsData();
    expect(settledTotal).toBe(1);

    // Assert 4 — a fresh message after the digest starts a new cycle. B has
    // not read the conversation, so its count keeps climbing; the assertion of
    // interest is that a NEW email arrives at all, not its exact count.
    await deleteMailSlurperMails();
    await sendMessage(aPage, 'US1-AS3 after the digest was dispatched');
    const [, afterWindowTotal] = await waitForMailsCountAtLeast(1, {
      timeout: directEmail.quietGraceMs,
    });
    expect(afterWindowTotal).toBe(1);
  });

  test('US1-AS4: A never receives any notification for her own message', async () => {
    test.setTimeout(
      digestTestTimeoutMs([directPush, directEmail], { cycles: 3 })
    );
    // Drain the tracks AS3's last send armed, so this scenario starts from a
    // clean slate and its counts are attributable to its own message. Grace
    // covers `email:direct` at its MAX-DELAY bound — the slower of the two
    // direct tracks — so both have provably flushed.
    await delay(directEmail.maxDelayGraceMs);
    await deleteMailSlurperMails();

    const baseline = await pushPublishedTotal();
    await sendMessage(aPage, 'US1-AS4 A sends, A must get nothing at all');

    // Even though A now HAS an active push subscription (setup step), the
    // publish delta must stay 1 (B only) — proving A is excluded at the
    // candidate-resolution level, not merely lacking a subscription.
    //
    // The claim here is that the delta STAYS 1, so it cannot be read at the
    // moment the delta first reaches 1: a self-notification to A would be
    // armed on A's OWN track and fire on A's own schedule, not alongside B's.
    // Poll bound covers `push:direct` quiet + sweep + settle; the settle then
    // covers `email:direct` at its MAX-DELAY bound — the longer of the two
    // direct tracks — so BOTH the second-publish check and the mailbox read
    // below happen after every dispatch this scenario could have armed.
    const pushDelta = await settledPushDelta(baseline, 1, {
      pollTimeoutMs: directPush.quietGraceMs,
      settleMs: directEmail.maxDelayGraceMs,
    });
    expect(pushDelta).toBe(1);

    const [mailItems] = await getMailsData();
    expect(toAddressesOf(mailItems)).not.toContain(userAEmail);
  });

  test('US1-AS5: hostile message content (quotes, newlines, HTML-like markup) never appears in the email subject or body', async () => {
    test.setTimeout(digestTestTimeoutMs(directEmail, { cycles: 3 }));
    // Drain the track AS4's send armed. Grace covers `email:direct` at its
    // MAX-DELAY bound, so the digest asserted on below carries only this
    // scenario's hostile message.
    await delay(directEmail.maxDelayGraceMs);
    await deleteMailSlurperMails();

    const marker = `HOSTILE${UniqueIDGenerator.getID()}`;
    const messageBox = aPage.getByRole('textbox', { name: 'Add a comment...' });
    await messageBox.fill(`${marker} Quote" test <script>alert(1)</script>`);
    await messageBox.press('Shift+Enter');
    // pressSequentially, not fill: the point is to APPEND a second line to the
    // multi-line draft the Shift+Enter above started, which fill() would
    // replace wholesale. (`locator.type()` does the same thing but is
    // deprecated.)
    await messageBox.pressSequentially(
      "Second line with 'quotes' and <b>bold</b>"
    );
    await messageBox.press('Enter');

    // Poll bound covers `email:direct` quiet + sweep + settle; the settle
    // re-reads at the MAX-DELAY bound so "exactly one" is read from a stable
    // inbox rather than at the first poll that saw an email.
    const [mailItems, total] = await waitForMailsCountAtLeast(1, {
      timeout: directEmail.quietGraceMs,
      settleMs: directEmail.maxDelayGraceMs,
    });
    expect(total).toBe(1);
    const mail = mailItems.find(m => m.toAddresses?.includes(userBEmail));
    expect(mail).toBeDefined();
    expect(mail!.subject).not.toContain(marker);
    expect(mail!.body).not.toContain(marker);
    expect(mail!.body).not.toContain('<script>');
    expect(mail!.body).not.toContain('Quote" test');

    await aContext.close();
  });
});
