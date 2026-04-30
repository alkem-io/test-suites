import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  emailField,
  passwordField,
  signInButton,
  signInHeading,
  userMenuAvatar,
  logoutMenuItem,
} from './common-authentication-page-elements';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** @testCase TC-1601, TC-1602, TC-1605 */
test.describe('Authentication - Login Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('user successful authentication with admin account', async ({
    page,
  }) => {
    // Navigate to login page
    await navigateToLoginPageFromMenu(baseUrl, page);

    // Fill in credentials and sign in
    await fillUpSignInPageElements('admin@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login by checking dashboard welcome message
    await verifyMyDashboardWelcomeElement(page);
  });

  test('user successful authentication with regular user account', async ({
    page,
  }) => {
    // Navigate to login page
    await navigateToLoginPageFromMenu(baseUrl, page);

    // Fill in credentials and sign in
    await fillUpSignInPageElements('non.space@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login by checking dashboard welcome message
    await verifyMyDashboardWelcomeElement(page);
  });

  test('invalid credentials show error message', async ({ page }) => {
    // Navigate to login page
    await navigateToLoginPageFromMenu(baseUrl, page);

    // Enter valid email with wrong password
    await fillUpSignInPageElements('admin@alkem.io', 'wrongpassword123', page);
    await pressSignInButtonSignInPage(page);

    // Verify error message is displayed
    const errorMessage = page.getByText(/email address or password.*invalid/i);
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Verify user is NOT signed in - form elements should still be visible
    await expect(emailField(page)).toBeVisible();
    await expect(passwordField(page)).toBeVisible();
    await expect(signInButton(page)).toBeVisible();
    await expect(signInHeading(page)).toBeVisible();
  });

  test('user can logout and session is cleared', async ({ page }) => {
    test.setTimeout(30000);

    // Sign in as admin
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('admin@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // Wait for sign-in to complete
    await verifyMyDashboardWelcomeElement(page);

    // Logout via user menu
    await userMenuAvatar(page).click();
    await logoutMenuItem(page).click();

    // Verify redirect to landing page by checking for sign-in option
    const signInOption = page
      .getByRole('link', { name: /sign up|sign in/i })
      .or(page.getByRole('button', { name: /sign up|sign in/i }));
    await expect(signInOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('user can logout and re-authenticate', async ({ page }) => {
    test.setTimeout(30000);

    // First sign in
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('admin@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);
    await verifyMyDashboardWelcomeElement(page);

    // Logout
    await userMenuAvatar(page).click();
    await logoutMenuItem(page).click();

    // Wait for logout to complete
    const signInOption = page
      .getByRole('link', { name: /sign up|sign in/i })
      .or(page.getByRole('button', { name: /sign up|sign in/i }));
    await expect(signInOption.first()).toBeVisible({ timeout: 5000 });

    // Sign in again with same credentials
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('admin@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful re-authentication
    await verifyMyDashboardWelcomeElement(page);
  });
});
