import {
  expect,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  readMyUser,
  seedPlatformRoleUsers,
  clearAddressCounters,
  testConfiguration,
  totpCode,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { grantCookieConsent } from '../helpers/cookies.helper';
import { must } from '../helpers/lib-actor.helper';
import { fillSecret } from '../helpers/login.helper';
import { navigateToLoginPageFromMenu } from '../authentication/login-page-objects';
import { fillUpSignInPageElements } from '../identity-flows/signin-page-objects';
import {
  logoutMenuItem,
  logInHeaderLink,
  signInButton,
  userMenuAvatar,
} from '../authentication/common-authentication-page-elements';

/**
 * Shared steps of the second-factor walks. Every string below is the en copy
 * of the client's own translation files (crd-auth `secondFactor.*`,
 * `secondFactorPage.*`; crd-contributorSettings `user.security.twoStep.*`;
 * crd-layout `secondFactorReminder.*`).
 */

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

/** The harness password every throwaway identity is created with. */
export const password = testConfiguration.identities.admin.password;

export const COPY = {
  secondStepTitle: 'Two-step verification',
  codeField: 'Authentication code',
  recoveryCodeField: 'Recovery code',
  verify: 'Verify',
  useRecoveryCode: 'Use a recovery code',
  useSecurityKey: 'Use a security key',
  pageTitle: 'Set up two-step verification',
  pageRequired:
    'Your account requires two-step verification. Set up a second factor below to continue.',
  pageEnrolled: 'Your second factor is set up. Sign in again to continue.',
  signInAgain: 'Sign in again',
  refusalToast: 'Two-step verification is required for your account.',
  sectionTitle: 'Two-step verification',
  authenticatorTitle: 'Authenticator app',
  qrAlt: 'QR code for your authenticator app',
  codeFromApp: 'Code from the app',
  confirm: 'Confirm',
  authenticatorActive: 'Your authenticator app is active.',
  remove: 'Remove',
  removeAuthenticatorTitle: 'Remove the authenticator app?',
  recoveryTitle: 'Recovery codes',
  needsFactor: 'Set up an authenticator app or a security key first.',
  generate: 'Generate recovery codes',
  shownOnce:
    'Save these codes somewhere safe now. They will not be shown again.',
  copy: 'Copy codes',
  copied: 'Copied',
  savedCodes: 'I have saved these codes',
  recoveryActive: 'You have recovery codes.',
  removeRecovery: 'Remove recovery codes',
  removeRecoveryTitle: 'Remove your recovery codes?',
  securityKeysTitle: 'Security keys',
  keyName: 'Name of the key',
  addKey: 'Add a security key',
  noKeys: 'No security keys added yet.',
  removeKey: (name: string) => `Remove ${name}`,
  removeKeyTitle: (name: string) => `Remove the security key "${name}"?`,
  reminderAction: 'Set it up',
  reminderDismiss: 'Dismiss',
  reminderText: (deadline: string) =>
    `Set up two-step verification before ${deadline}. After that date you cannot use Alkemio until you do.`,
  orgRuleSwitch: 'Require two-step verification for members',
} as const;

/** A fresh browser session with cookie consent granted up front. */
export const freshPage = async (
  browser: Browser
): Promise<{ context: BrowserContext; page: Page }> => {
  const context = await browser.newContext();
  await grantCookieConsent(context);
  return { context, page: await context.newPage() };
};

/** The role tokens a walk acts with, read with the counters cleared around it. */
export const roleTokens = async (): Promise<{
  support: string;
  usersAdmin: string;
}> => {
  await clearAddressCounters();
  const { tokens } = await seedPlatformRoleUsers();
  await clearAddressCounters();
  return {
    support: tokens.PLATFORM_SUPPORT,
    usersAdmin: tokens.PLATFORM_USERS_ADMIN,
  };
};

export const nameIdOf = async (user: ThrowawayUser): Promise<string> =>
  must(await readMyUser({ bearerToken: user.token }), `read ${user.email}`).me
    .user!.nameID;

/** The password step from the header's "Log in" link. */
export const submitPassword = async (
  page: Page,
  email: string
): Promise<void> => {
  await navigateToLoginPageFromMenu(baseUrl, page);
  await fillUpSignInPageElements(email, password, page);
  await signInButton(page).click();
};

export const secondStepHeading = (page: Page): Locator =>
  page.getByRole('heading', { name: COPY.secondStepTitle, exact: true });

/** The second step's code field (the label carries a required-field suffix). */
export const secondStepCodeField = (page: Page): Locator =>
  page.getByRole('textbox', { name: new RegExp(`^${COPY.codeField}`) });

export const secondStepRecoveryField = (page: Page): Locator =>
  page.getByRole('textbox', { name: new RegExp(`^${COPY.recoveryCodeField}`) });

/**
 * Submits one value at the second step and waits for the identity provider's
 * answer to that submission (a native form POST to the login flow).
 */
export const submitSecondStep = async (
  page: Page,
  field: Locator,
  value: string
): Promise<void> => {
  await fillSecret(field, value);
  await Promise.all([
    page.waitForResponse(
      r =>
        r.request().method() === 'POST' &&
        r.url().includes('/self-service/login')
    ),
    page.getByRole('button', { name: COPY.verify, exact: true }).click(),
  ]);
};

/**
 * Arms a waiter for the next GraphQL answer that carries the member's
 * second-factor requirement — the read the reminder renders from. Register it
 * before the navigation that triggers the read.
 */
export const requirementRead = (page: Page) =>
  page.waitForResponse(response => {
    if (!response.url().includes('graphql') || !response.ok()) return false;
    try {
      const query: unknown = response.request().postDataJSON()?.query;
      return typeof query === 'string' && query.includes('secondFactorRequirement');
    } catch {
      return false;
    }
  });

/** Signed in: the authenticated header, and no "Log in" link. */
export const expectSignedIn = async (page: Page): Promise<void> => {
  await expect(userMenuAvatar(page)).toBeVisible();
  await expect(
    page
      .getByRole('banner')
      .getByRole('button', { name: 'Notifications', exact: true })
  ).toBeVisible();
  await expect(logInHeaderLink(page)).toHaveCount(0);
};

export const logOut = async (page: Page): Promise<void> => {
  await userMenuAvatar(page).click();
  await logoutMenuItem(page).click();
  await expect(logInHeaderLink(page)).toBeVisible();
};

/** The user's own Security tab, scrolled to the two-step section. */
export const openSecurityTab = async (
  page: Page,
  nameId: string
): Promise<Locator> => {
  await page.goto(
    `${baseUrl}/user/${nameId}/settings/security#two-step-verification`
  );
  const heading = page.getByRole('heading', {
    name: COPY.sectionTitle,
    exact: true,
  });
  await expect(heading).toBeVisible();
  // A collapsible settings section wraps its title in a trigger button.
  const trigger = heading.getByRole('button');
  if (
    (await trigger.count()) > 0 &&
    (await trigger.getAttribute('aria-expanded')) !== 'true'
  ) {
    await trigger.click();
  }
  return block(page, COPY.authenticatorTitle);
};

/** One block of the two-step section (Authenticator app, Recovery codes…). */
export const block = (page: Page, title: string): Locator =>
  page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });

/** The key the setup form shows beside the QR code ("Key: <base32>"). */
export const shownAuthenticatorKey = async (page: Page): Promise<string> => {
  const authenticator = block(page, COPY.authenticatorTitle);
  await expect(
    authenticator.getByRole('img', { name: COPY.qrAlt, exact: true })
  ).toBeVisible();
  const keyLine = authenticator.getByText(/^Key:\s/);
  const secret = ((await keyLine.textContent()) ?? '')
    .replace(/^Key:\s*/, '')
    .trim();
  // A boolean, so a failure message never carries the key.
  expect(/^[A-Z2-7]+=*$/.test(secret)).toBe(true);
  return secret;
};

/**
 * Enrols the authenticator app from the setup form on screen (Security, or
 * the /second-factor page): reads the key shown beside the QR code, confirms
 * it with a computed code, and returns the key.
 */
export const enrolAuthenticatorOnPage = async (page: Page): Promise<string> => {
  const authenticator = block(page, COPY.authenticatorTitle);
  const secret = await shownAuthenticatorKey(page);
  await fillSecret(
    authenticator.getByRole('textbox', { name: COPY.codeFromApp, exact: true }),
    totpCode(secret)
  );
  await authenticator
    .getByRole('button', { name: COPY.confirm, exact: true })
    .click();
  return secret;
};

/**
 * A CDP virtual authenticator on `page` (Chromium only): a platform
 * authenticator that holds resident keys and verifies the user without a
 * prompt, so a WebAuthn ceremony completes on its own.
 */
export const addVirtualAuthenticator = async (page: Page): Promise<void> => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
};

/** Chromium's errors for a host the page could not reach (the walks run on Chromium). */
const UNREACHABLE = [
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_CONNECTION_CLOSED',
  'ERR_CONNECTION_TIMED_OUT',
  'ERR_TIMED_OUT',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_ADDRESS_UNREACHABLE',
];

/**
 * Every request of the page that failed at the network level — a host that
 * could not be reached, a refused connection. A request the browser aborted (a
 * navigation cancelling an in-flight fetch) or blocked on a response it did
 * receive (ERR_BLOCKED_BY_RESPONSE: the host answered) is not such a failure.
 */
export const failedRequests = (page: Page): string[] => {
  const failed: string[] = [];
  page.on('requestfailed', request => {
    const reason = request.failure()?.errorText ?? '';
    if (UNREACHABLE.some(code => reason.includes(code))) {
      failed.push(`${request.method()} ${request.url()} (${reason})`);
    }
  });
  return failed;
};
