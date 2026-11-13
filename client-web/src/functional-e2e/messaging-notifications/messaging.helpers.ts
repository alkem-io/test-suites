import { expect, Page, Browser } from '@playwright/test';
import { navigateToRegistrationFromSignUpFillFormAndContinue } from '../authentication/login-page-objects';
import { fillUpSignUpPasswordElements } from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { nextButton } from '../authentication/common-authentication-page-elements';
import {
  delay,
  getMailsToSince,
  getQueueStats,
  getUserToken,
  getVerificationLinkFor,
  markMailbox,
  readMyConversations,
  subscribeToPushNotifications,
  UniqueIDGenerator,
  waitForMailsToSince,
  waitForQueuePublishIncrease,
  type MailboxMark,
  type MailItem,
} from '@alkemio/tests-lib';
import { sessionActor } from '../helpers/lib-actor.helper';

/**
 * Shared fixtures for the 034-messaging-notifications acceptance walks (US1,
 * US2, US3). These used to be copy-pasted per suite, which is how the
 * settle-before-exact-count discipline below ended up applied to one copy and
 * not the other.
 *
 * Every suite here registers its personas INLINE through the real sign-up
 * flow rather than reusing the repo's session-based storage-state fixtures in
 * `.auth/`. That is deliberate and load-bearing, not an oversight: these
 * walks assert on notification SETTINGS DEFAULTS for a brand-new account
 * (US3-AS1) and on notification delivery to accounts whose read state and
 * digest tracks start empty. A persisted, reused session carries settings and
 * unread state from previous runs, which is exactly what would make a digest
 * assertion unreproducible.
 */

export const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';

/**
 * Registration/setup steps wait on Kratos and the mail catcher, never on a
 * digest, so a fixed timeout is correct for them. Every step that waits on a
 * NOTIFICATION must derive its timeout from `digestWindow(...)` instead.
 */
export const SETUP_TIMEOUT_MS = 90_000;

export interface RegisteredUser {
  email: string;
  /** The accessible name Playwright's role locators will match on. */
  displayName: string;
}

/**
 * Registers + email-verifies a brand new user via the real sign-up flow, and
 * leaves the browser signed in as them.
 *
 * `firstName`/`lastName` MUST carry a run-unique component. Display names,
 * unlike emails, are otherwise identical across runs, and the people-picker
 * lookups in these walks locate a person by accessible name — against a
 * never-reset dev stack a fixed name resolves to a stale persona from an
 * earlier run (or trips Playwright's strict-mode violation).
 */
export async function registerAndVerifyUser(
  page: Page,
  emailLocalPart: string,
  firstName: string,
  lastName: string
): Promise<RegisteredUser> {
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
  // No inbox wipe: the verification link is read by recipient, and the
  // address is run-unique, so no other registration's token can match.
  await nextButton(page).click();

  await expect(
    page.getByRole('heading', { name: 'Verify your email' })
  ).toBeVisible();

  await expect
    .poll(() => getVerificationLinkFor(userEmail), {
      message: `verification link for ${userEmail} in the inbox`,
      timeout: 30_000,
    })
    .toBeTruthy();
  const verificationLink = (await getVerificationLinkFor(userEmail))!;

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

  return { email: userEmail, displayName: `${firstName} ${lastName}` };
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
export async function subscribeToPush(page: Page, label: string) {
  const uniqueId = `${label}-${Date.now()}`;
  const subscriptionData = {
    endpoint: `https://fcm.googleapis.com/fcm/send/${uniqueId}`,
    p256dh: `BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPQ-${uniqueId}`,
    auth: `tBHItJI5svbpC7htN-${uniqueId.slice(0, 8)}`,
  };
  const result = await subscribeToPushNotifications(
    subscriptionData,
    await sessionActor(page)
  );
  if (result.error) {
    throw new Error(
      `subscribeToPushNotifications failed: ${JSON.stringify(result.error.errors)}`
    );
  }
  if (!result.data?.subscribeToPushNotifications?.id) {
    throw new Error(
      `subscribeToPushNotifications returned no subscription id for "${label}" ` +
        '— the push adapter would silently no-op for this recipient, making ' +
        `every push assertion about them meaningless: ${JSON.stringify(result)}`
    );
  }
}

/**
 * Plain-text chat goes browser -> Synapse, so Send only works once the page's
 * Matrix client exists; before that the client refuses with "Send was not
 * confirmed". The client publishes its session right before its first sync,
 * so that sync answering is the observable "chat is ready" event. Armed before
 * each navigation (a reload builds a new client) and awaited by sendMessage.
 *
 * A page that is armed but never sends (US2-AS3 opens D's panel only to read
 * it) closes with the wait still pending, which rejects it. Unobserved, that
 * rejection is an unhandled one and Playwright fails whichever test is running.
 * The no-op handler only marks it observed: `sendMessage` awaits the same
 * promise and still fails on a timeout or a closed page.
 */
const matrixReady = new WeakMap<Page, Promise<unknown>>();
const MATRIX_READY_TIMEOUT_MS = 60_000;
export function armMatrixReady(page: Page) {
  const ready = page.waitForResponse(
    r => r.url().includes('/_matrix/client/v3/sync') && r.ok(),
    { timeout: MATRIX_READY_TIMEOUT_MS }
  );
  ready.catch(() => {});
  matrixReady.set(page, ready);
}

export async function openChatPanel(page: Page) {
  armMatrixReady(page);
  await page.goto(`${baseUrl}/home`);
  await page.getByRole('button', { name: 'Open chat' }).click();
}

export async function openConversationByName(page: Page, name: string) {
  await openChatPanel(page);
  await page.getByRole('button', { name }).first().click();
}

export async function sendMessage(page: Page, text: string) {
  if (!matrixReady.has(page)) armMatrixReady(page);
  await matrixReady.get(page);
  const messageBox = page.getByRole('textbox', { name: 'Add a comment...' });
  await messageBox.fill(text);
  await messageBox.press('Enter');
  await expect(page.getByText(text)).toBeVisible();
}

export async function newContextPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

/**
 * The mailboxes of a walk's own personas, marked at one instant. The mail sink
 * is shared with every other suite on the stack, so these walks never prune it
 * and never count the whole inbox: every claim is "what arrived for THIS
 * persona since the mark" (lib `markMailbox` / `getMailsToSince`), which also
 * keeps each persona's own verification mail out of the count.
 *
 * Mark every persona the scenario makes a claim about — the intended recipient
 * AND everyone who must get nothing — immediately before the send.
 */
export type Mailboxes = Record<string, MailboxMark>;

export async function markMailboxes(
  addresses: Record<string, string>
): Promise<Mailboxes> {
  const entries = await Promise.all(
    Object.entries(addresses).map(
      async ([who, address]) => [who, await markMailbox(address)] as const
    )
  );
  return Object.fromEntries(entries);
}

/** New mail for every marked persona, read now. */
export async function newMailsOf(
  marks: Mailboxes
): Promise<Record<string, MailItem[]>> {
  const entries = await Promise.all(
    Object.entries(marks).map(
      async ([who, mark]) => [who, await getMailsToSince(mark)] as const
    )
  );
  return Object.fromEntries(entries);
}

/**
 * Polls `mark`'s recipient until at least `atLeast` mails have arrived since
 * the mark, then — when `settleMs` is given — waits that much longer and
 * RE-READS before returning (lib `waitForMailsToSince`).
 *
 * The settle read is what makes an "exactly N" caller meaningful. Without it
 * the result is the mailbox as sampled at the very first poll that crossed the
 * threshold, so a second, incorrect email that lands a moment later is never
 * observed. Under R4 that window is wide: a wrongly-armed digest sits on its
 * own track and can land a full max-delay after the intended one, so
 * `settleMs` should be that track's `maxDelayGraceMs` — never a literal.
 *
 * Omit `settleMs` only where the caller performs its own settle + re-read
 * afterwards, or where the claim genuinely is "a new email arrived at all".
 */
export async function waitForNewMails(
  mark: MailboxMark,
  atLeast: number,
  { timeout, settleMs }: { timeout: number; settleMs?: number }
): Promise<MailItem[]> {
  return waitForMailsToSince(mark, { atLeast, timeoutMs: timeout, settleMs });
}

/**
 * Waits for the push queue's cumulative publish counter to advance by at least
 * `expectedIncrease` past `baseline`, then settles `settleMs` longer and
 * re-reads before returning the FINAL delta.
 *
 * Same discipline, same reason as `waitForNewMails`'s settle read:
 * `waitForQueuePublishIncrease` returns at the first observation that meets
 * the threshold, so asserting the exact delta straight after it can only ever
 * prove "at least N". Claims of the form "the delta STAYS 1, proving the
 * sender is excluded" need the settle, because the extra publish they are
 * hunting for is armed on a DIFFERENT recipient's track and fires on that
 * track's own schedule — pass the slower relevant track's `maxDelayGraceMs`.
 */
export async function settledPushDelta(
  baseline: number,
  expectedIncrease: number,
  { pollTimeoutMs, settleMs }: { pollTimeoutMs: number; settleMs: number }
): Promise<number> {
  await waitForQueuePublishIncrease(
    PUSH_NOTIFICATIONS_QUEUE,
    baseline,
    expectedIncrease,
    { timeout: pollTimeoutMs }
  );
  // eslint-disable-next-line no-restricted-syntax -- negative settle window on the queue counter (digest max-delay bound)
  await delay(settleMs);
  const stats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
  return stats.publishedTotal - baseline;
}

/** Current cumulative publish count for the push queue — an emit baseline. */
export async function pushPublishedTotal(): Promise<number> {
  return (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)).publishedTotal;
}

/**
 * Display names of the conversations `email` can currently see, read through
 * the API with that user's own token (`me.conversations`). The browser is not
 * the oracle for "C no longer has the group": membership removal lands
 * asynchronously (the member leaves the Matrix room, then the server persists
 * the removal), so a UI read can only say what the page last rendered.
 */
export async function conversationNamesOf(email: string): Promise<string[]> {
  const bearerToken = await getUserToken(email);
  const result = await readMyConversations({ bearerToken });
  // This read is the evidence that a removal landed, and US2-AS4 polls it
  // with `.not.toContain`: a failed read that came back as `[]` would pass
  // that poll at once. So anything but HTTP 200 with a conversations array
  // throws; the status and the errors/body name the cause.
  const conversations = result.data?.me?.conversations?.conversations;
  if (result.status !== 200 || result.error || !conversations) {
    throw new Error(
      `me.conversations read failed for ${email} (HTTP ${result.status}): ${JSON.stringify(result.error?.errors ?? result.data).slice(0, 300)}`
    );
  }
  return conversations.map(c => c.room.displayName);
}
