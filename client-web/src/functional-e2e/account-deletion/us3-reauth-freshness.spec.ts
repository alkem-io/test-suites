// plan: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// (US3 — re-authentication for a stale session; D-1 / D-2)
//
// `@local-stack` as a whole (W2 Tier 0 item 3): the only way to make a REAL
// browser session older than the 15-minute privileged window without waiting
// 15 minutes is to age its record in the server's session store
// (`findBffSessionIdBySub` + `ageBffSessionCreatedAt`, loopback Redis via
// HARNESS_REDIS_*). The shared test cluster offers neither Redis nor a clock
// override, so the nightly never lists these cases; the local-stack runner
// does. Everything else is portable: the outcome is read back over GraphQL
// (`lookup.user` as the platform admin), not from the audit table, and the
// walk starts on the Account tab's Danger Zone (client-web#10437).
//
// One subject, one signed-in page, fixed order: on the aged session "Delete
// account" never opens a dialog — the pre-flight finds the session stale and
// the client ends the Kratos SSO session and sends the browser to a real
// sign-in (nothing is deleted) → a real sign-in completes it → back on the
// Account tab the confirm dialog reopens with the typed name CLEARED (never
// auto-executed) → type and confirm → deleted.
//
// US3-AS4 (SSO-only identities) and AS5/AS6 (fail-closed on a missing or
// unparseable `created_at`; silent refresh does not count) have no browser-
// observable difference here and are proven at the it-spec level.

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  ageBffSessionCreatedAt,
  decodeJwtPayloadUnsafe,
  findBffSessionIdBySub,
  getUserToken,
} from '@alkemio/tests-lib';
import { fillSecret } from '../helpers/login.helper';
import {
  confirmDeleteButton,
  deleteAccountTriggerButton,
  deleteSubjectIfPresent,
  DisposableSubject,
  harnessPassword,
  loginAsSubject,
  logInHeaderLink,
  openDeleteAccountSection,
  PRIVILEGED_SESSION_WINDOW_S,
  provisionSubject,
  runTeardown,
  typedNameField,
  userExists,
} from './delete-account.helpers';

/**
 * Ages the session the browser holds for `subject` to just past the
 * privileged window. The Kratos `sub` comes from a throwaway non-interactive
 * bearer (only its claim is read); the session is found in the store by that
 * `sub`, so nothing depends on the cookie's encoding.
 */
const ageCurrentBrowserSessionFor = async (
  subject: DisposableSubject
): Promise<void> => {
  const kratosSub = decodeJwtPayloadUnsafe(
    await getUserToken(subject.email)
  ).sub;
  if (typeof kratosSub !== 'string' || kratosSub.length === 0) {
    throw new Error('ageCurrentBrowserSessionFor: no sub claim on the bearer');
  }
  const sessionId = await findBffSessionIdBySub(kratosSub);
  await ageBffSessionCreatedAt(
    sessionId,
    Math.floor(Date.now() / 1000) - (PRIVILEGED_SESSION_WINDOW_S + 60)
  );
};

/** The sign-in form the re-authentication round trip lands on. */
const passwordField = (page: Page) =>
  page.getByRole('textbox', { name: 'Password' });

/**
 * Completes the identity provider's sign-in. The client ends the Kratos SSO
 * session first, so a real form is shown; the email may come pre-filled and
 * read-only ("confirm it's you") or empty, depending on flow configuration.
 */
const completeReauthentication = async (
  page: Page,
  subject: DisposableSubject
): Promise<void> => {
  await expect(passwordField(page)).toBeVisible();
  const emailField = page.getByRole('textbox', { name: 'E-Mail' });
  // The form is rendered (password visible), so a count is not a race.
  if ((await emailField.count()) > 0 && (await emailField.isEditable())) {
    await emailField.fill(subject.email);
  }
  await fillSecret(passwordField(page), harnessPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};

let staleSubject: DisposableSubject | undefined;
let staleContext: BrowserContext | undefined;

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await runTeardown([
    ['close context', async () => staleContext?.close()],
    // A no-op once AS3 deleted the subject — the normal outcome.
    ['delete subject', () => deleteSubjectIfPresent(staleSubject?.userId)],
  ]);
});

test.describe(
  'Re-authentication for a stale session',
  // Needs loopback Redis to age a real session (see the file header).
  { tag: ['@forge-acceptance', '@local-stack'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    let stalePage: Page;

    test.beforeAll(async ({ browser }) => {
      test.setTimeout(180_000);
      staleSubject = await provisionSubject('us3stale');
      staleContext = await browser.newContext();
      stalePage = await staleContext.newPage();
      await loginAsSubject(stalePage, staleSubject.email);
      await openDeleteAccountSection(stalePage);
      await ageCurrentBrowserSessionFor(staleSubject);
    });

    test('US3-AS1/AS2: a stale session is sent to a real sign-in, nothing is deleted, and the confirm reopens empty', async () => {
      await deleteAccountTriggerButton(stalePage).click();

      // The pre-flight found the session stale: no dialog, the browser left
      // the Account tab for the sign-in form.
      await expect(passwordField(stalePage)).toBeVisible();
      expect(new URL(stalePage.url()).pathname).not.toMatch(
        /\/settings\/account$/
      );
      await expect(typedNameField(stalePage)).toHaveCount(0);

      // Nothing was deleted.
      expect(await userExists(staleSubject!.userId)).toBe(true);

      await completeReauthentication(stalePage, staleSubject!);

      // Back on the Account tab: the confirm dialog reopens with the typed
      // name cleared — never auto-executed on the fresh session.
      await stalePage.waitForURL(/\/settings\/account/);
      await expect(typedNameField(stalePage)).toBeVisible();
      await expect(typedNameField(stalePage)).toHaveValue('');
      expect(await userExists(staleSubject!.userId)).toBe(true);
    });

    test('US3-AS3: confirming on the freshly re-authenticated session deletes the account', async () => {
      await typedNameField(stalePage).fill(staleSubject!.displayName);
      const confirmButton = confirmDeleteButton(stalePage);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      await expect(logInHeaderLink(stalePage)).toBeVisible();
      expect(await userExists(staleSubject!.userId)).toBe(false);
    });
  }
);
