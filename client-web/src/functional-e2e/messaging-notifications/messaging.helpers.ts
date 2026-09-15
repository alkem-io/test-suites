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
  deleteMailSlurperMails,
  getMailsData,
  getQueueStats,
  getVerificationLink,
  UniqueIDGenerator,
  waitForQueuePublishIncrease,
} from '@alkemio/tests-lib';

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
  if (!result.data?.subscribeToPushNotifications?.id) {
    throw new Error(
      `subscribeToPushNotifications returned no subscription id for "${label}" ` +
        '— the push adapter would silently no-op for this recipient, making ' +
        `every push assertion about them meaningless: ${JSON.stringify(result)}`
    );
  }
}

export async function openChatPanel(page: Page) {
  await page.goto(`${baseUrl}/home`);
  await page.getByRole('button', { name: 'Open chat' }).click();
}

export async function openConversationByName(page: Page, name: string) {
  await openChatPanel(page);
  await page.getByRole('button', { name }).first().click();
}

export async function sendMessage(page: Page, text: string) {
  const messageBox = page.getByRole('textbox', { name: 'Add a comment...' });
  await messageBox.fill(text);
  await messageBox.press('Enter');
  await expect(page.getByText(text)).toBeVisible();
}

export const toAddressesOf = (mailItems: { toAddresses?: string[] }[]) =>
  mailItems.flatMap(item => item.toAddresses ?? []);

export type MailItem = {
  toAddresses?: string[];
  subject?: string;
  body?: string;
};

export async function newContextPage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

/**
 * Polls Mailslurper until at least `expectedCount` mails are present, then —
 * when `settleMs` is given — waits that much longer and RE-READS before
 * returning.
 *
 * The settle read is what makes an `expect(total).toBe(N)` caller meaningful.
 * Without it the helper returns the mailbox as sampled at the very first poll
 * that crossed the threshold, so a second, incorrect email that lands a moment
 * later is never observed and the suite proves "at least N, sampled early"
 * while the acceptance criterion says "exactly N". Under R4 that window is
 * wide: a leaked recipient's digest sits on their OWN track and can land a
 * full max-delay after the intended one, so `settleMs` should be that track's
 * `maxDelayGraceMs` — never a literal.
 *
 * Omit `settleMs` only where the caller performs its own settle + re-read
 * afterwards, or where the claim genuinely is "a new email arrived at all".
 */
export async function waitForMailsCountAtLeast(
  expectedCount: number,
  {
    timeout = 15_000,
    interval = 1_000,
    settleMs,
  }: { timeout?: number; interval?: number; settleMs?: number } = {}
): Promise<[MailItem[], number]> {
  const start = Date.now();
  let [mailItems, total] = (await getMailsData()) as [MailItem[], number];
  while (total < expectedCount && Date.now() - start < timeout) {
    await delay(interval);
    [mailItems, total] = (await getMailsData()) as [MailItem[], number];
  }

  if (settleMs !== undefined && total >= expectedCount) {
    await delay(settleMs);
    [mailItems, total] = (await getMailsData()) as [MailItem[], number];
  }

  return [mailItems, total];
}

/**
 * Waits for the push queue's cumulative publish counter to advance by at least
 * `expectedIncrease` past `baseline`, then settles `settleMs` longer and
 * re-reads before returning the FINAL delta.
 *
 * Same discipline, same reason as `waitForMailsCountAtLeast`'s settle read:
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
  await delay(settleMs);
  const stats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
  return stats.publishedTotal - baseline;
}

/** Current cumulative publish count for the push queue — an emit baseline. */
export async function pushPublishedTotal(): Promise<number> {
  return (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE)).publishedTotal;
}
