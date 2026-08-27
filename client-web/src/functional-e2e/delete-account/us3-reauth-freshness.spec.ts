// Durable regression cover for the delete-own-account acceptance walk
// covering the "re-authentication for a stale session" story (US3-AS1..AS3).
//
// A genuinely REAL session, aged in place — never a fabricated one. The
// subject logs in through the real Kratos self-service flow exactly like
// every other walk in this area, then the ONE session that login produced
// is located in Redis by its Kratos identity `sub`
// (`findBffSessionIdBySub`, `@alkemio/tests-lib`) and its `created_at`
// rewritten to just past the 15-minute privileged window
// (`ageBffSessionCreatedAt`). This proves the freshness gate keys off the
// SAME session the browser is holding, not a stand-in for it — and, unlike
// `mint-bff-session.ts`'s fabrication primitive, never writes a payload
// that did not originate from a real sign-in.
//
// One subject (`staleSubject`) carries the whole flow on a single
// continuously authenticated page, in fixed order: clicking "Delete
// account" on the aged session never reaches the confirm dialog at all —
// the freshness check runs in the pre-flight, BEFORE either dialog opens
// (data-model.md §9), so the client routes straight to the identity
// provider's real re-authentication round trip via the OIDC BFF login route
// (nothing is deleted) → a REAL re-login completes it → back on the
// Security tab the confirm dialog auto-opens with the typed-name field
// cleared (never auto-executed) → type and confirm → deletion succeeds on
// the now-fresh session — hence `serial` mode for this file, the same
// reason us1/us2 use it.
//
// US3-AS4 (SSO-only identities never see a password prompt) and AS5/AS6
// (fail-closed on missing/unparseable `created_at`, silent-refresh does not
// count) have no browser-observable difference from this flow's happy path
// and no SSO-only harness identity to drive them with — both are proven at
// the it-spec level instead (delete-own-account.it-spec.ts, T305).

import { expect, test, type Page } from '@playwright/test';
import {
  ageBffSessionCreatedAt,
  decodeJwtPayloadUnsafe,
  findBffSessionIdBySub,
  getUserToken,
} from '@alkemio/tests-lib';
import {
  confirmDeleteButton,
  deleteAccountTriggerButton,
  deleteUserQuietly,
  DisposableSubject,
  getAuditRowsFor,
  harnessPassword,
  loginAsSubject,
  logInHeaderLink,
  navigateToSecurityTab,
  PRIVILEGED_SESSION_WINDOW_S,
  provisionSubject,
  typedNameField,
} from './delete-account.helpers';

/**
 * Ages the REAL BFF session the browser is currently holding for `subject`
 * to just past the privileged window. Resolves the Kratos identity id via a
 * throwaway non-interactive bearer (never used for auth — only its `sub`
 * claim is read, same technique `mintBffSessionForUser` uses), then finds
 * that identity's session in Redis by `sub` rather than reading the
 * browser's own signed cookie — no dependency on the cookie's wire encoding
 * or signing scheme, only on Redis holding the session the login produced.
 */
const ageCurrentBrowserSessionFor = async (
  subject: DisposableSubject
): Promise<void> => {
  const nonInteractiveToken = await getUserToken(subject.email);
  const kratosSub = decodeJwtPayloadUnsafe(nonInteractiveToken).sub;
  if (typeof kratosSub !== 'string' || kratosSub.length === 0) {
    throw new Error(
      `ageCurrentBrowserSessionFor: no 'sub' claim on the non-interactive token for '${subject.email}'`
    );
  }
  const sessionId = await findBffSessionIdBySub(kratosSub);
  const staleCreatedAtEpochS =
    Math.floor(Date.now() / 1000) - (PRIVILEGED_SESSION_WINDOW_S + 60);
  await ageBffSessionCreatedAt(sessionId, staleCreatedAtEpochS);
};

/**
 * Completes the identity provider's real re-authentication round trip.
 * `useDeleteAccount`'s `redirectToReauth` sends the browser through the OIDC
 * BFF login route (`/api/auth/oidc/login`, `prompt: 'login'`) rather than
 * any Kratos-native `?refresh=true` settings-flow redirect — that mechanism
 * belongs to the Settings flow's own privileged-session handling and is
 * explicitly not what this hook uses. The round trip may hop through more
 * than one intermediate URL before landing on the sign-in form, so this
 * waits on the form's own locator rather than any particular URL shape; the
 * identity's email may arrive pre-filled and read-only (a "confirm it's
 * you" prompt) or as a normal editable field depending on flow
 * configuration — filling it only when present keeps this robust to either
 * shape rather than asserting one.
 */
const completeReauthenticationPrompt = async (
  page: Page,
  subject: DisposableSubject
): Promise<void> => {
  const passwordField = page.getByRole('textbox', { name: 'Password *' });
  await expect(passwordField).toBeVisible({ timeout: 20_000 });

  const emailField = page.getByRole('textbox', { name: 'E-Mail *' });
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(subject.email);
  }
  await passwordField.fill(harnessPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};

test.describe(
  'Re-authentication for a stale session',
  { tag: '@forge-acceptance' },
  () => {
    // The whole flow shares one aged-then-refreshed session in a fixed
    // order — see the file header.
    test.describe.configure({ mode: 'serial' });

    let staleSubject: DisposableSubject;
    let staleContext: Awaited<ReturnType<import('@playwright/test').Browser['newContext']>>;
    let stalePage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      staleSubject = await provisionSubject('us3stale');

      staleContext = await browser.newContext();
      stalePage = await staleContext.newPage();
      await loginAsSubject(stalePage, staleSubject.email);
      await navigateToSecurityTab(stalePage);
      await ageCurrentBrowserSessionFor(staleSubject);
    });

    test.afterAll(async () => {
      await staleContext?.close().catch(() => {});
      await deleteUserQuietly(staleSubject?.userId);
    });

    test('US3-AS1/AS2: a stale session is refused, nothing is deleted, and the client routes to real re-authentication', async () => {
      test.setTimeout(60_000);

      // Freshness routing happens BEFORE either dialog ever opens
      // (data-model.md §9): the pre-flight's `sessionFresh` flag sends a
      // stale session straight to the OIDC BFF login route, so the confirm
      // dialog's typed-name field never mounts here — asserting the
      // departure from the Security tab, not any dialog content, is the
      // only signal the shipped connector actually produces.
      await deleteAccountTriggerButton(stalePage).click();
      await stalePage.waitForURL(
        url => !url.pathname.endsWith('/settings/security'),
        { timeout: 20_000 }
      );

      // Nothing was deleted: no primary audit row for this subject yet.
      const rowsBeforeReauth = await getAuditRowsFor(staleSubject.userId);
      expect(
        rowsBeforeReauth.filter(row => row.outcome === 'account_deleted')
      ).toHaveLength(0);

      await completeReauthenticationPrompt(stalePage, staleSubject);

      // Back on the Security tab: the confirm dialog auto-reopens with the
      // typed-name field CLEARED — the deletion is never auto-executed on
      // the freshly re-authenticated session.
      const reopenedField = typedNameField(stalePage);
      await expect(reopenedField).toBeVisible({ timeout: 20_000 });
      await expect(reopenedField).toHaveValue('');
    });

    test('US3-AS3: confirming again on the freshly re-authenticated session completes deletion', async () => {
      test.setTimeout(30_000);

      await typedNameField(stalePage).fill(staleSubject.displayName);
      const confirmButton = confirmDeleteButton(stalePage);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      await expect(
        stalePage.getByText(/Couldn't delete your account/i)
      ).toHaveCount(0);
      await expect(logInHeaderLink(stalePage)).toBeVisible({
        timeout: 15_000,
      });
    });
  }
);
