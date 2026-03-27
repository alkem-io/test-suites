import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  continueButton,
  emailField,
  passwordField,
  recoveryCodeField,
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

test.describe('Authentication - Password Recovery Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await deleteMailSlurperMails();
  });

  test('user successful password recovery', async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for email-dependent flow

    // IMPORTANT: We intentionally reuse the same password to ensure test idempotency.
    // This means the password recovery flow is tested without actually changing the password,
    // preventing test pollution in subsequent runs.
    const newPassword = password;

    // Navigate to login page
    await navigateToLoginPageFromMenu(baseUrl, page);

    // Click forgot password link
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    // Enter email for recovery
    await emailField(page).click();
    await emailField(page).fill('non.space@alkem.io');
    await continueButton(page).click();

    // Wait for recovery email to arrive
    await delay(3000);

    if (isLocalEnv) {
      // Code recovery flow (local): extract 6-digit code and enter it
      const getEmailsData = await getRecoveryCode();
      const recoveryCodeFromEmail = getEmailsData[0];
      if (recoveryCodeFromEmail === undefined) {
        throw new Error('Recovery code from email is missing!');
      }

      await recoveryCodeField(page).click();
      await recoveryCodeField(page).fill(recoveryCodeFromEmail);
      await continueButton(page).click();
    } else {
      // Link recovery flow (remote): poll for recovery link
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

    // Set new password
    await passwordField(page).click();
    await passwordField(page).fill(newPassword);

    // Verify we're on User Settings page
    await expect(
      page.getByRole('heading', { name: 'User Settings' })
    ).toBeVisible({ timeout: 10000 });

    // Save the new password
    await saveButton(page).click();

    // Verify successful login after password recovery
    await verifyMyDashboardWelcomeElement(page);

    // Verify dashboard elements are visible
    await expect(
      page.getByRole('button', { name: 'Invitations' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Account' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Create my own Space' })
    ).toBeVisible();

    // Note: Password is intentionally reset to the same value (newPassword === password),
    // so this test is idempotent and does not cause test pollution.
  });
});
