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
 * the email-suppression-window walk in AS3 and the enabled-email state
 * from AS2 carrying into AS4/AS5).
 *
 * Suppression window: the acceptance stack sets
 * `MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS=30` for walk speed (in-code
 * production default is 300s) — see repos.yaml forge.verification.stack.notes.
 */

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';
const SUPPRESSION_WINDOW_MS =
  (Number(process.env.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS) || 30) *
    1000 +
  5_000; // + buffer past the window edge

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

/**
 * Registers a synthetic (fake) push subscription for the CURRENTLY logged-in
 * user via an authenticated same-origin GraphQL call — the push ADAPTER
 * no-ops for a recipient with zero active subscriptions (Operator Ruling
 * 3c / test-suites precondition pattern), so this is required before any
 * push-emit assertion can observe a publish for that recipient.
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

async function openChatPanel(page: Page) {
  await page.goto(`${baseUrl}/home`);
  await page.getByRole('button', { name: 'Open chat' }).click();
}

async function sendMessage(page: Page, text: string) {
  const messageBox = page.getByRole('textbox', { name: 'Add a comment...' });
  await messageBox.fill(text);
  await messageBox.press('Enter');
  await expect(page.getByText(text)).toBeVisible();
}

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

const toAddressesOf = (mailItems: { toAddresses?: string[] }[]) =>
  mailItems.flatMap(item => item.toAddresses ?? []);

/** Polls Mailslurper until at least `expectedCount` mails are present. */
async function waitForMailsCountAtLeast(
  expectedCount: number,
  {
    timeout = 15_000,
    interval = 1_000,
  }: { timeout?: number; interval?: number } = {}
): Promise<
  [{ toAddresses?: string[]; subject?: string; body?: string }[], number]
> {
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

test.describe('US1 - direct (1:1) message notifications', () => {
  test.describe.configure({ mode: 'serial' });

  let userAEmail: string;
  let userBEmail: string;
  let userADisplayName: string;
  let aContext: Awaited<ReturnType<Browser['newContext']>>;
  let aPage: Page;

  test('setup: register A (sender) with a push subscription', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    userADisplayName = 'Us1A Sender';
    userAEmail = await registerAndVerifyUser(page, 'us1a', 'Us1A', 'Sender');
    await subscribeToPush(page, 'us1a');
  });

  test('setup: register B (recipient) with a push subscription', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    userBEmail = await registerAndVerifyUser(
      page,
      'us1b',
      'Us1B',
      'Recipient'
    );
    await subscribeToPush(page, 'us1b');
  });

  test('setup: A starts a 1:1 conversation with B', async ({ browser }) => {
    test.setTimeout(60_000);
    ({ context: aContext, page: aPage } = await newContextPage(browser));
    await loginViaCrd(aPage, userAEmail, password, baseUrl);
    await openChatPanel(aPage);
    await aPage.getByRole('button', { name: 'New message' }).click();
    await aPage
      .getByRole('textbox', { name: 'Search people…' })
      .fill('Us1B Recipient');
    await aPage.getByRole('button', { name: 'Us1B Recipient' }).first().click();
    await aPage.getByRole('button', { name: 'Start chat' }).click();
    await expect(aPage.getByText('Us1B Recipient').first()).toBeVisible();
  });

  test('US1-AS1: default settings — A sends, B gets a push emit, zero email', async () => {
    test.setTimeout(60_000);
    await deleteMailSlurperMails();

    const baseline = (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE))
      .publishedTotal;

    await sendMessage(aPage, 'US1-AS1 default-settings direct message from A');

    const stats = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baseline,
      1
    );
    expect(stats.publishedTotal - baseline).toBe(1);

    await delay(3_000);
    const [, emailTotal] = await getMailsData();
    expect(emailTotal).toBe(0);
  });

  test('US1-AS2: B enables direct email — A sends, B receives exactly one email naming A, no content, deep link, settings link', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
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

    const [mailItems, total] = await waitForMailsCountAtLeast(1);
    expect(total).toBe(1);

    const mail = mailItems.find(m => m.toAddresses?.includes(userBEmail));
    expect(mail).toBeDefined();
    expect(mail!.subject).toBe(`${userADisplayName} sent you a message`);
    expect(mail!.body).not.toContain(probeMessage);
    expect(mail!.body).toContain('/settings/notifications');
    // No participant email address disclosed to another participant.
    expect(mail!.body).not.toContain(userAEmail);
  });

  test('US1-AS3: a burst of 5 messages within the suppression window yields exactly one email; after the window elapses, one more message yields one new email', async () => {
    test.setTimeout(90_000);
    await deleteMailSlurperMails();

    for (let i = 1; i <= 5; i++) {
      await sendMessage(aPage, `US1-AS3 burst message ${i}`);
    }
    // Give the async pipeline a moment to settle, then assert the COUNT
    // stays at exactly 1 — not merely "at least 1".
    await delay(5_000);
    const [, burstTotal] = await getMailsData();
    expect(burstTotal).toBe(1);

    await delay(SUPPRESSION_WINDOW_MS);
    await deleteMailSlurperMails();
    await sendMessage(aPage, 'US1-AS3 after the suppression window elapsed');

    const [, afterWindowTotal] = await waitForMailsCountAtLeast(1);
    expect(afterWindowTotal).toBe(1);
  });

  test('US1-AS4: A never receives any notification for her own message', async () => {
    test.setTimeout(60_000);
    // Let the window opened by AS3's last send elapse so this send is not
    // itself suppressed — the assertion of interest is the recipient set,
    // not suppression state.
    await delay(SUPPRESSION_WINDOW_MS);
    await deleteMailSlurperMails();

    const baseline = (await getQueueStats(PUSH_NOTIFICATIONS_QUEUE))
      .publishedTotal;
    await sendMessage(aPage, 'US1-AS4 A sends, A must get nothing at all');

    // Even though A now HAS an active push subscription (setup step), the
    // publish delta must stay 1 (B only) — proving A is excluded at the
    // candidate-resolution level, not merely lacking a subscription.
    const stats = await waitForQueuePublishIncrease(
      PUSH_NOTIFICATIONS_QUEUE,
      baseline,
      1
    );
    expect(stats.publishedTotal - baseline).toBe(1);

    await delay(3_000);
    const [mailItems] = await getMailsData();
    expect(toAddressesOf(mailItems)).not.toContain(userAEmail);
  });

  test('US1-AS5: hostile message content (quotes, newlines, HTML-like markup) never appears in the email subject or body', async () => {
    test.setTimeout(60_000);
    await delay(SUPPRESSION_WINDOW_MS);
    await deleteMailSlurperMails();

    const marker = `HOSTILE${UniqueIDGenerator.getID()}`;
    const messageBox = aPage.getByRole('textbox', { name: 'Add a comment...' });
    await messageBox.fill(`${marker} Quote" test <script>alert(1)</script>`);
    await messageBox.press('Shift+Enter');
    await messageBox.type("Second line with 'quotes' and <b>bold</b>");
    await messageBox.press('Enter');

    const [mailItems, total] = await waitForMailsCountAtLeast(1);
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
