import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  continueButton,
  emailField,
  passwordField,
  recoveryCodeField,
  saveButton,
} from './common-authentication-page-elements';
import {
  delay,
  deleteMailSlurperMails,
  getRecoveryCode,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Authentication - Password Recovery Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await deleteMailSlurperMails();
  });

  test('user successful password recovery', async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for email-dependent flow

    const newPassword = password; // Reusing same password for test stability

    // Navigate to login page
    await navigateToLoginPageFromMenu(baseUrl, page);

    // Click forgot password link
    await page.getByRole('link', { name: 'Forgot password?' }).click();

    // Enter email for recovery
    await emailField(page).click();
    await emailField(page).fill('non.space@alkem.io');
    await continueButton(page).click();

    // Wait for email and get recovery code
    await delay(1500);
    const getEmailsData = await getRecoveryCode();
    const recoveryCodeFromEmail = getEmailsData[0];
    if (recoveryCodeFromEmail === undefined) {
      throw new Error('Recovery code from email is missing!');
    }

    // Enter recovery code
    await recoveryCodeField(page).click();
    await recoveryCodeField(page).fill(recoveryCodeFromEmail);
    await continueButton(page).click();

    // Set new password
    await passwordField(page).click();
    await passwordField(page).fill(newPassword);

    // Verify we're on User Settings page
    await expect(
      page.getByRole('heading', { name: 'User Settings' })
    ).toBeVisible();

    // Save the new password
    await saveButton(page).click();

    // Verify successful login after password recovery
    await expect(
      page
        .locator('div')
        .filter({ hasText: /^Welcome, non!Ready to make some impact\?$/ })
        .nth(2)
    ).toBeVisible();

    // Verify dashboard elements are visible
    await expect(
      page.getByRole('button', { name: 'Invitations' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Tips & Tricks' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Account' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Create my own Space' })
    ).toBeVisible();

    // TODO: After password reset, revert password to initial state
    // to avoid test pollution in subsequent runs
  });
});
