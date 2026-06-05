import { test, expect, Page } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  continueButton,
  dismissNewLookDialog,
  passwordField,
  recoveryCodeField,
  recoveryEmailField,
  saveButton,
} from './common-authentication-page-elements';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  delay,
  deleteMailSlurperMails,
  getRecoveryCode,
  getRecoveryLink,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const isLocalEnv = baseUrl.includes('localhost');

/**
 * Drives the recovery flow from the CRD recovery screen (already navigated to)
 * through to a saved new password. Handles both environment variants:
 * - Local (isLocalEnv): the 6-digit code flow via getRecoveryCode.
 * - Remote/test env: the recovery-link flow via getRecoveryLink.
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

  if (isLocalEnv) {
    // Code recovery flow (local): extract the 6-digit code and enter it.
    const getEmailsData = await getRecoveryCode();
    const recoveryCodeFromEmail = getEmailsData[0];
    if (recoveryCodeFromEmail === undefined) {
      throw new Error('Recovery code from email is missing!');
    }

    await recoveryCodeField(page).click();
    await recoveryCodeField(page).fill(recoveryCodeFromEmail);
    await continueButton(page).click();
  } else {
    // Link recovery flow (remote/test env): poll for the recovery link.
    let recoveryLink: string | undefined;
    for (let attempt = 0; attempt < 10; attempt++) {
      recoveryLink = await getRecoveryLink();
      if (recoveryLink) break;
      await delay(2000);
    }
    if (recoveryLink === undefined) {
      throw new Error('Recovery link from email is missing!');
    }

    await page.goto(recoveryLink);
  }

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

  // Runs end-to-end on environments exposing the recovery LINK flow (e.g. the
  // test env, isLocalEnv === false). The local code-flow branch is kept ready
  // and will run once the @alkemio/tests-lib `getRecoveryCode` bug is fixed.
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
