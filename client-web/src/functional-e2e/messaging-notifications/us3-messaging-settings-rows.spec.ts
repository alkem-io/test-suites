import { test, expect, Page } from '@playwright/test';
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
  getVerificationLink,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

/**
 * @forge-acceptance
 *
 * Live acceptance walk for workspace#034-messaging-notifications, User Story
 * 3 ("Control messaging notifications in my settings", P1) — see
 * specs/034-messaging-notifications/spec.md and repos.yaml
 * (forge.verification.tracks[type=acceptance].stories[story=US3]).
 *
 * Covers US3-AS1..AS5:
 *  - AS1: a freshly registered user sees both messaging rows at the
 *    mandated defaults (email OFF, push ON, in-app locked OFF + caption).
 *  - AS2: a pre-existing account's settings page never errors and shows the
 *    same defaults (the destructive migration:revert/migration:run replay
 *    that simulates the pre-rollout shape is an acceptance-only step — see
 *    the comment on that test below).
 *  - AS3: forcing the stored in-app preference to true through the public
 *    updateUserSettings mutation never results in an in-app notification
 *    once a message is delivered — enforcement lives at the platform
 *    boundary, not the settings screen.
 *  - AS4: toggling email/push on a messaging row persists across reload.
 *  - AS5: the chat panel's settings shortcut lands on notification settings
 *    with both rows visible in one navigation.
 */

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const adminEmail = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

type ChannelSwitch = {
  ariaLabel: string | null;
  ariaChecked: string | null;
  disabled: boolean;
};

/**
 * Locates the three [role="switch"] channel controls (In-App, Email, Push)
 * for a messaging notification row, identified by a fragment of its
 * activity label. The settings table has no per-row test id, so the row is
 * located by walking up from its label text to the nearest ancestor that
 * carries exactly three channel switches (mirrors the CRD row layout: one
 * label + a 3-switch cell group per row).
 */
async function getMessagingRowSwitches(
  page: Page,
  rowLabelFragment: string
): Promise<ChannelSwitch[] | null> {
  return page.evaluate(fragment => {
    const candidates = Array.from(document.querySelectorAll('body *'));
    const textNode = candidates.find(
      el =>
        el.children.length <= 3 &&
        (el.textContent ?? '').includes(fragment) &&
        (el.textContent ?? '').length < fragment.length + 200
    );
    let node: Element | null = textNode ?? null;
    for (let i = 0; i < 8 && node; i++) {
      const switches = node.querySelectorAll('[role="switch"]');
      if (switches.length === 3) {
        return Array.from(switches).map(s => ({
          ariaLabel: s.getAttribute('aria-label'),
          ariaChecked: s.getAttribute('aria-checked'),
          disabled: (s as HTMLButtonElement).disabled,
        }));
      }
      node = node.parentElement;
    }
    return null;
  }, rowLabelFragment);
}

function directRowEmailToggle(page: Page) {
  return page.locator(
    '[aria-label="Toggle Email notification for: Receive a notification when someone sends me a direct (1:1) chat message"]'
  );
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

test.describe('US3 - messaging notification settings rows', () => {
  // Scenarios share registered users (recipient created in AS1, sender
  // created in AS3) and must run in registration order.
  test.describe.configure({ mode: 'serial' });

  let recipientEmail: string;

  test('US3-AS1: a freshly registered user sees both messaging rows at the mandated defaults', async ({
    page,
  }) => {
    test.setTimeout(90000);
    await deleteMailSlurperMails();
    recipientEmail = await registerAndVerifyUser(
      page,
      'us3recipient',
      'Us3',
      'Recipient'
    );

    await page.goto(`${baseUrl}/user/me/settings/notifications`);
    await expect(
      page.getByText(
        'Receive a notification when someone sends me a direct (1:1) chat message'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'Receive a notification when someone posts in a group chat I am a member of'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        "Chat messages always show up in the chat panel, so in-app notifications for this row can't be turned off"
      ).first()
    ).toBeVisible();

    for (const rowFragment of [
      'direct (1:1) chat message',
      'posts in a group chat',
    ]) {
      const switches = await getMessagingRowSwitches(page, rowFragment);
      expect(switches, `row switches for "${rowFragment}"`).not.toBeNull();

      const inApp = switches!.find(s =>
        s.ariaLabel?.includes("can't be turned off")
      );
      const email = switches!.find(s =>
        s.ariaLabel?.startsWith('Toggle Email')
      );
      const push = switches!.find(s => s.ariaLabel?.startsWith('Toggle Push'));

      // In-app: locked OFF, disabled, carries the explanation as its label.
      expect(inApp?.disabled).toBe(true);
      expect(inApp?.ariaChecked).toBe('false');
      // Email: default OFF.
      expect(email?.ariaChecked).toBe('false');
      expect(email?.disabled).toBe(false);
      // Push: default ON.
      expect(push?.ariaChecked).toBe('true');
      expect(push?.disabled).toBe(false);
    }
  });

  test('US3-AS2: a pre-existing account loads notification settings without error and shows the same defaults', async ({
    page,
  }) => {
    // The backfill migration (AddConversationMessageNotificationSettings)
    // that gives pre-rollout accounts these two rows is exercised once,
    // manually, during acceptance via `pnpm run migration:revert` (strips
    // the keys from every row, reproducing the legacy pre-rollout shape)
    // followed by `pnpm run migration:run` (re-applies the backfill) — see
    // specs/034-messaging-notifications/repos.yaml
    // (forge.verification.stack.notes). Replaying that destructive,
    // whole-table cycle is not appropriate inside a routine, repeatable
    // regression spec, so this test instead guards the observable
    // regression symptom directly (risk R-2): logging into ANY existing
    // account must never surface the
    // "Cannot return null for non-nullable field
    // UserSettingsNotificationUser.conversationMessageDirect" GraphQL error,
    // and must show both rows at their backfilled defaults.
    await loginViaCrd(page, adminEmail, password, baseUrl);
    await page.goto(`${baseUrl}/user/me/settings/notifications`);

    await expect(
      page.getByText(
        'Receive a notification when someone sends me a direct (1:1) chat message'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'Receive a notification when someone posts in a group chat I am a member of'
      )
    ).toBeVisible();
    await expect(page.getByText('INTERNAL_SERVER_ERROR')).toHaveCount(0);
    await expect(page.getByText('Cannot return null')).toHaveCount(0);
  });

  test('US3-AS3: forcing the stored in-app flag on through the public settings API never produces an in-app notification', async ({
    page,
    browser,
  }) => {
    test.setTimeout(60000);
    await deleteMailSlurperMails();
    await registerAndVerifyUser(page, 'us3sender', 'Us3', 'Sender');

    // Recipient's own session drives the public GraphQL API directly
    // (same-origin fetch, authenticated via the session cookie) to force
    // the stored preference on, bypassing the (correctly locked) settings
    // UI, then to assert the in-app notification count/list afterward.
    const recipientContext = await browser.newContext();
    const recipientPage = await recipientContext.newPage();
    await loginViaCrd(recipientPage, recipientEmail, password, baseUrl);

    const gql = (query: string, variables?: Record<string, unknown>) =>
      recipientPage.evaluate(
        async ({ query, variables }) => {
          const res = await fetch('/api/private/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query, variables }),
          });
          return res.json();
        },
        { query, variables }
      );

    const me = await gql('query { me { user { id } } }');
    const userID = me.data.me.user.id;

    const forceUpdate = await gql(
      `mutation Force($userID: UUID!, $settings: UpdateUserSettingsEntityInput!) {
        updateUserSettings(settingsData: { userID: $userID, settings: $settings }) {
          id
          settings { notification { user { conversationMessageDirect { inApp } } } }
        }
      }`,
      {
        userID,
        settings: {
          notification: {
            user: { conversationMessageDirect: { inApp: true } },
          },
        },
      }
    );
    expect(
      forceUpdate.data.updateUserSettings.settings.notification.user
        .conversationMessageDirect.inApp
    ).toBe(true);

    // Sender starts a 1:1 conversation with the recipient and sends a
    // message.
    await page.goto(`${baseUrl}/home`);
    await page.getByRole('button', { name: 'Open chat' }).click();
    await page.getByRole('button', { name: 'New message' }).click();
    await page
      .getByRole('textbox', { name: 'Search people…' })
      .fill('Us3 Recipient');
    await page.getByRole('button', { name: 'Us3 Recipient' }).click();
    await page.getByRole('button', { name: 'Start chat' }).click();

    const probeMessage = `US3-AS3 forced in-app probe ${UniqueIDGenerator.getID()}`;
    const messageBox = page.getByRole('textbox', { name: 'Add a comment...' });
    await messageBox.fill(probeMessage);
    await messageBox.press('Enter');
    await expect(page.getByText(probeMessage)).toBeVisible();

    // Wait for the message to fully propagate to the recipient (their chat
    // conversation list picks up the sender) before asserting the negative —
    // this bounds the async notification pipeline without a blind sleep.
    await recipientPage.goto(`${baseUrl}/home`);
    await recipientPage.getByRole('button', { name: 'Open chat' }).click();
    await expect(
      recipientPage.getByText('Us3 Sender').first()
    ).toBeVisible({ timeout: 15000 });

    const notifCount = await gql('query { me { notificationsUnreadCount } }');
    expect(notifCount.data.me.notificationsUnreadCount).toBe(0);

    const notifList = await gql(
      'query { me { notifications(first: 10) { inAppNotifications { id } } } }'
    );
    expect(notifList.data.me.notifications.inAppNotifications).toHaveLength(0);

    await recipientContext.close();
  });

  test('US3-AS4: toggling email on a messaging row persists across reload', async ({
    page,
  }) => {
    await loginViaCrd(page, recipientEmail, password, baseUrl);
    await page.goto(`${baseUrl}/user/me/settings/notifications`);

    const emailToggle = directRowEmailToggle(page);
    await expect(emailToggle).toHaveAttribute('aria-checked', 'false');
    await emailToggle.click();
    await expect(emailToggle).toHaveAttribute('aria-checked', 'true');

    await page.reload();
    await expect(directRowEmailToggle(page)).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test("US3-AS5: the chat panel's settings shortcut lands on notification settings with both rows visible", async ({
    page,
  }) => {
    await loginViaCrd(page, recipientEmail, password, baseUrl);
    await page.goto(`${baseUrl}/home`);

    await page.getByRole('button', { name: 'Open chat' }).click();
    await page.getByRole('button', { name: 'Notification settings' }).click();

    await expect(page).toHaveURL(/\/user\/me\/settings\/notifications/);
    await expect(
      page.getByText(
        'Receive a notification when someone sends me a direct (1:1) chat message'
      )
    ).toBeVisible();
    await expect(
      page.getByText(
        'Receive a notification when someone posts in a group chat I am a member of'
      )
    ).toBeVisible();
  });
});
