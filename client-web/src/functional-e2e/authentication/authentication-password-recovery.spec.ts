import { test, expect, Page } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  continueButton,
  dismissNewLookDialog,
  passwordField,
  recoveryEmailField,
  saveButton,
} from './common-authentication-page-elements';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  delay,
  deleteMailSlurperMails,
  getRecoveryLink,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/**
 * Drives the recovery flow from the CRD recovery screen (already navigated to)
 * through to a saved new password. Both local and remote Kratos send a recovery
 * LINK (no 6-digit code), so this polls MailSlurper for the recovery link and
 * navigates to it to reach the "Set new password" screen.
 *
 * NOTE: the CRD/Kratos "set new password" screen rejects a new password equal to
 * the current one ("The new password must be different from the old password"),
 * so callers must pass a password that differs from the account's current one.
 */
const submitRecoveryAndSetPassword = async (
  page: Page,
  email: string,
  newPassword: string
) => {
  await deleteMailSlurperMails();

  // Recovery request screen: enter the account email (field labelled "Email *").
  await recoveryEmailField(page).click();
  await recoveryEmailField(page).fill(email);
  await continueButton(page).click();

  // Wait for the recovery email to arrive.
  await delay(3000);

  // Poll for the recovery link and navigate to it. Recipient-filtered: the
  // MailSlurper inbox is shared, and another suite's recovery mail (e.g. the
  // connected-accounts recovery regression spec's, for a different persona)
  // arriving mid-poll must never be opened here — completing recovery against
  // it would set THAT persona's password to this test's temporary value.
  let recoveryLink: string | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    recoveryLink = await getRecoveryLink(email);
    if (recoveryLink) break;
    await delay(2000);
  }
  if (recoveryLink === undefined) {
    throw new Error('Recovery link from email is missing!');
  }

  await page.goto(recoveryLink);

  // CRD "Set new password" screen.
  await expect(
    page.getByRole('heading', { name: 'Set new password' })
  ).toBeVisible({ timeout: 10000 });
  await passwordField(page).click();
  await passwordField(page).fill(newPassword);
  await saveButton(page).click();
};

test.describe('Authentication - Password Recovery Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await deleteMailSlurperMails();
  });

  // Runs end-to-end against the CRD recovery LINK flow, which both local and
  // remote Kratos use (the recovery email carries a self-service/recovery link,
  // not a 6-digit code).
  //
  // Idempotency: the CRD set-password screen rejects reusing the current
  // password, so the test sets a distinct temporary password, verifies the
  // recovered session, then restores the shared default password in a `finally`
  // (guarded so it only runs if the password was actually changed) — keeping
  // `non.space@alkem.io` usable by the other suites that sign in as that user.
  test('user successful password recovery', async ({ page, context }) => {
    test.setTimeout(120000); // two email-dependent recovery cycles

    const recoveryUser = 'non.space@alkem.io';
    const tempPassword = `${password}Tmp9!`;
    let passwordChanged = false;

    try {
      // Cycle 1 — via the UI entry path, recover to a NEW (different) password.
      await navigateToLoginPageFromMenu(baseUrl, page);
      await page.getByRole('link', { name: 'Forgot password?' }).click();
      await submitRecoveryAndSetPassword(page, recoveryUser, tempPassword);
      passwordChanged = true;

      // Saving the new password signs the user in — opt into the new design and
      // verify the authenticated dashboard.
      await dismissNewLookDialog(page);
      await verifyMyDashboardWelcomeElement(page);

      await expect(
        page.getByRole('button', { name: 'Invitations' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'My Account' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Create my own Space' })
      ).toBeVisible();
    } finally {
      // Restore the shared default password (only if it was changed), from a
      // logged-out state so the recovery screen renders the email form.
      if (passwordChanged) {
        await context.clearCookies();
        await page.goto(`${baseUrl}/recovery`);
        await submitRecoveryAndSetPassword(page, recoveryUser, password);
      }
    }
  });
});
