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
// continuously authenticated page, in fixed order: attempt deletion on the
// aged session (refused, nothing deleted) → the client auto-routes to
// Kratos's `?refresh=true` "confirm it's you" prompt → a REAL re-login
// completes it → back on the Security tab the confirm dialog re-opens with
// the typed-name field cleared (never auto-executed) → re-type and confirm
// → deletion succeeds on the now-fresh session — hence `serial` mode for
// this file, the same reason us1/us2 use it.
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
 * Completes the identity provider's real re-authentication round trip. The
 * `?refresh=true` Kratos flow may present the identity's email pre-filled
 * and read-only (a "confirm it's you" prompt) or as a normal editable
 * field depending on flow configuration — filling it only when present
 * keeps this robust to either shape rather than asserting one.
 */
const completeReauthenticationPrompt = async (
  page: Page,
  subject: DisposableSubject
): Promise<void> => {
  await page.waitForURL(/refresh=true/i, { timeout: 20_000 });

  const emailField = page.getByRole('textbox', { name: 'E-Mail *' });
  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(subject.email);
  }
  await page
    .getByRole('textbox', { name: 'Password *' })
    .fill(harnessPassword);
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

      await deleteAccountTriggerButton(stalePage).click();
      await typedNameField(stalePage).fill(staleSubject.displayName);
      const confirmButton = confirmDeleteButton(stalePage);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // The distinct "session refresh required" signal surfaces as the
      // client auto-routing to the identity provider's real re-
      // authentication round trip — never a silent success, never the
      // dialog's own generic failure text.
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
