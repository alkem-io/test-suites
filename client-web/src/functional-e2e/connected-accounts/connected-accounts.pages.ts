import { Browser, Locator, Page } from '@playwright/test';
import { ensurePersonaState } from '../fixtures/authenticated-session.fixture';

// Page objects for the Connected Accounts section of the User Security tab
// (workspace#051-cleverbase-account-linking).
//
// Verified against the client-web sources:
//  - ConnectedAccountsView.tsx — ul/li provider + credential rows, per-row
//    native forms, aria-label'd Connect/Disconnect buttons, locked row with
//    aria-disabled + aria-describedby.
//  - UserSecurityTabView.tsx — SettingsCard chrome; #password / #passkeys
//    anchor containers.
//  - card.tsx — CRD cards are plain divs with data-slot="card"; CardTitle is
//    an <h4>, so getByRole('heading') works. Cards carry no region role.
//
// Selector policy (anti-flake, non-negotiable):
//  - EVERY button/link name lookup passes `exact: true`. Playwright's
//    accessible-name matching is case-insensitive SUBSTRING matching by
//    default, and 'Connect X' is a substring of 'Disconnect X' — without
//    `exact` a Connect lookup resolves 2 elements and strict mode throws.
//  - The disconnect confirm dialog accessors are scoped to
//    getByRole('alertdialog') (Radix AlertDialogContent). The row trigger
//    (accessible name 'Disconnect LinkedIn') stays in the DOM behind the
//    overlay while the dialog's confirm button is named 'Disconnect', so an
//    unscoped page-level { name: 'Disconnect' } lookup is a strict-mode
//    violation by construction.
//  - State labels use exact 'Connected' / 'Not connected' — never an
//    unanchored /connected/i, which matches both.

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// The interactive GraphQL endpoint the SPA itself uses (cookie-authenticated;
// see client-web src/main/constants/endpoints.ts `privateGraphQLEndpoint`).
const privateGraphQLEndpoint = `${baseUrl}/api/private/graphql`;

/**
 * Providers the local dev Kratos advertises OIDC link nodes for. If a dev
 * stack lacks one of these (e.g. GitHub is configured locally but not on the
 * remote test env — see identity-flows/signin-page-objects.ts), this list is
 * the single edit point.
 */
export const PROVIDERS = ['Microsoft', 'LinkedIn', 'GitHub'] as const;

/** Exact i18n copy under test (contributorSettings.en.json — user.security.connectedAccounts). */
export const COPY = {
  sectionTitle: 'Connected Accounts',
  notConnected: 'Not connected',
  connected: 'Connected',
  lockedReason:
    'This is your only way to sign in right now — add a password or a passkey below before you can disconnect it.',
  // NOTE: this string uses an ASCII hyphen in the shipped i18n while every
  // sibling string uses an em dash — mirrored verbatim here because this file's
  // contract is the exact rendered copy (see contributorSettings.en.json,
  // user.security.connectedAccounts.unavailable.message).
  unavailableMessage: "We can't show your sign-in methods right now. Try again in a moment - no reload needed.",
  unavailableRetry: 'Try again',
  identityAlreadyLinked:
    'That identity is already connected to a different Alkemio account. Nothing has changed on either account.',
  linked: (provider: string) => `${provider} connected.`,
  unlinked: (provider: string) => `${provider} disconnected.`,
  connectFailed: (provider: string) => `Couldn't connect ${provider} — try again.`,
  reauthRequiredConnect: (provider: string) => `Confirm it's you, then connect ${provider} again.`,
  confirmDisconnectTitle: (provider: string) => `Disconnect ${provider}?`,
  confirmDisconnectDescription: (provider: string) =>
    `You won't be able to sign in with ${provider} anymore. If you reconnect later and the provider has changed how it identifies you, this exact connection may not come back.`,
} as const;

/** The Connected Accounts settings card ([data-slot="card"] filtered by its h4 title). */
export const sectionCard = (page: Page): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: COPY.sectionTitle, exact: true }) });

/** One provider row (role=listitem scoped inside the section card). */
export const providerRow = (page: Page, providerName: string): Locator =>
  sectionCard(page).getByRole('listitem').filter({ hasText: providerName });

/** One credential state row ('Password' or 'Passkey'). */
export const credentialRow = (page: Page, label: 'Password' | 'Passkey'): Locator =>
  sectionCard(page).getByRole('listitem').filter({ hasText: label });

/** The enabled Connect button of a not-connected row (aria-label `Connect <provider>`). */
export const connectButton = (page: Page, providerName: string): Locator =>
  providerRow(page, providerName).getByRole('button', {
    name: `Connect ${providerName}`,
    exact: true,
  });

/** The enabled Disconnect trigger of a connected (unlocked) row (aria-label `Disconnect <provider>`). */
export const disconnectTrigger = (page: Page, providerName: string): Locator =>
  providerRow(page, providerName).getByRole('button', {
    name: `Disconnect ${providerName}`,
    exact: true,
  });

/**
 * The locked (aria-disabled) disconnect control of a connected-locked row.
 * It carries NO aria-label, so its accessible name is the bare visible label
 * 'Disconnect' — distinct (under exact matching) from the enabled trigger's
 * 'Disconnect <provider>'.
 */
export const lockedDisconnectButton = (page: Page, providerName: string): Locator =>
  providerRow(page, providerName).getByRole('button', { name: 'Disconnect', exact: true });

/** The Radix confirm dialog (AlertDialogContent renders role="alertdialog"). */
export const confirmDialog = (page: Page): Locator => page.getByRole('alertdialog');

/** Confirm button INSIDE the dialog — never looked up at page level (see header note). */
export const dialogConfirmButton = (page: Page): Locator =>
  confirmDialog(page).getByRole('button', { name: 'Disconnect', exact: true });

/** Cancel button INSIDE the dialog (AlertDialogCancel default label t('dialogs.cancel') = 'Cancel'). */
export const dialogCancelButton = (page: Page): Locator =>
  confirmDialog(page).getByRole('button', { name: 'Cancel', exact: true });

/** The Change Password card's in-page anchor container. */
export const passwordCard = (page: Page): Locator => page.locator('#password');

/** The Passkeys card's in-page anchor container (its h4 title is 'Security'). */
export const passkeyCard = (page: Page): Locator => page.locator('#passkeys');

/**
 * The Kratos-rendered new-password input inside the Change Password card.
 * FloatingField appends ' *' to required labels, and the card ALSO renders a
 * 'Confirm new password *' field whose accessible name contains 'Password' —
 * so this accessor pins the full exact label. A bare /password/i here is a
 * guaranteed strict-mode violation (matches both fields).
 */
export const newPasswordField = (page: Page): Locator =>
  passwordCard(page).getByLabel('Password *', { exact: true });

/** The client-only confirm field inside the Change Password card (exact label). */
export const confirmNewPasswordField = (page: Page): Locator =>
  passwordCard(page).getByLabel('Confirm new password *', { exact: true });

/** The Change Password card's submit (Kratos settings password method label: 'Save'). */
export const passwordSaveButton = (page: Page): Locator =>
  passwordCard(page).getByRole('button', { name: 'Save', exact: true });

/**
 * Copy-free structural anchor for "an error rendered inside the Change
 * Password card": Kratos node-level failures surface as the field's
 * errorMessage (input aria-invalid + described-by error text, FloatingField),
 * flow-level failures as a role='alert' Message (CrdKratosPasswordCard).
 * Either one satisfies the containment contract; neither matches the card's
 * always-present static copy, so this can never be vacuously true.
 */
export const passwordCardError = (page: Page): Locator =>
  passwordCard(page)
    .getByRole('alert')
    .or(passwordCard(page).locator('input[aria-invalid="true"]'))
    .first();

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const profileUrlQuery =
  'query ConnectedAccountsSpecProfileUrl { me { user { profile { url } } } }';

const parseProfileUrl = (body: unknown): string => {
  const url = (
    body as { data?: { me?: { user?: { profile?: { url?: string } } } } }
  )?.data?.me?.user?.profile?.url;
  if (!url) {
    throw new Error(
      `Could not resolve the signed-in user's profile URL from ${privateGraphQLEndpoint}: ${JSON.stringify(body)}`
    );
  }
  // Normalise to an absolute URL against the base under test and drop any
  // trailing slash so `${profileUrl}/settings/security` composes cleanly.
  return new URL(url, baseUrl).toString().replace(/\/$/, '');
};

/**
 * Resolves the signed-in persona's own profile URL at runtime via the same
 * GraphQL endpoint the SPA uses (page.request shares the context's session
 * cookies and BYPASSES page.route mocks, so this works even in specs that
 * mock /api/private/graphql).
 *
 * Never hardcode /user/<slug> paths: no existing spec proves a slug
 * derivation for these personas, and server-api suites delete/recreate
 * qa.user, which can leave a suffixed nameID (qa-user-2) on a shared dev DB.
 */
export async function resolveOwnProfileUrl(page: Page): Promise<string> {
  const response = await page.request.post(privateGraphQLEndpoint, {
    data: { operationName: 'ConnectedAccountsSpecProfileUrl', query: profileUrlQuery },
  });
  if (!response.ok()) {
    throw new Error(`Profile URL query failed with HTTP ${response.status()}`);
  }
  return parseProfileUrl(await response.json());
}

/** `<profileUrl>/settings/security` — same shape buildSettingsTabUrl produces. */
export const securitySettingsUrlFrom = (profileUrl: string): string => `${profileUrl}/settings/security`;

/** Convenience: the signed-in persona's own Security settings URL. */
export async function resolveOwnSecurityUrl(page: Page): Promise<string> {
  return securitySettingsUrlFrom(await resolveOwnProfileUrl(page));
}

/**
 * Resolves ANOTHER persona's profile URL by borrowing that persona's own
 * cached storage state (login happens at most once per run via
 * ensurePersonaState) for a single cookie-authenticated GraphQL call in a
 * throwaway context. Read-only — no identity is mutated.
 */
export async function resolveProfileUrlFor(browser: Browser, email: string): Promise<string> {
  const statePath = await ensurePersonaState(browser, email);
  const context = await browser.newContext({ storageState: statePath });
  try {
    const response = await context.request.post(privateGraphQLEndpoint, {
      data: { operationName: 'ConnectedAccountsSpecProfileUrl', query: profileUrlQuery },
    });
    if (!response.ok()) {
      throw new Error(`Profile URL query for ${email} failed with HTTP ${response.status()}`);
    }
    return parseProfileUrl(await response.json());
  } finally {
    await context.close();
  }
}
