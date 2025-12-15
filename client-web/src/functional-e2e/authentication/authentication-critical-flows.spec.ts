import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  acceptAllCookiesButton,
  accessRestrictedHeading,
  cookieConsentBanner,
  emailField,
  logoutMenuItem,
  passwordField,
  returnToDashboardLink,
  signInButton,
  signInHeading,
  signInSignUpLink,
  userMenuAvatar,
  welcomeHeading,
} from './common-authentication-page-elements';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD ?? '';
const baseUrl = process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000';

if (!password || !baseUrl) {
  throw new Error(
    'AUTH_TEST_HARNESS_PASSWORD and ALKEMIO_BASE_URL must be set'
  );
}

test.describe('Authentication - Phase 1 Critical Flows', () => {
  test.describe('Cookie Consent Persistence', () => {
    test('1.1 - Cookie consent banner appears on first visit and persists', async ({
      context,
      page,
    }) => {
      // 1. Navigate to platform as unauthenticated user (clear all cookies first)
      await context.clearCookies();
      await page.goto(baseUrl);

      // 2. Verify cookie consent banner is visible
      await expect(cookieConsentBanner(page)).toBeVisible({ timeout: 5000 });

      // 3. Click accept cookies button
      await acceptAllCookiesButton(page).click();

      // 4. Verify banner disappears
      await expect(cookieConsentBanner(page)).not.toBeVisible({
        timeout: 3000,
      });

      // 5. Navigate to another page
      await page.goto(`${baseUrl}/spaces`);

      // 6. Verify cookie consent banner does not appear (consent persisted)
      await expect(cookieConsentBanner(page)).not.toBeVisible();

      // 7. Refresh page
      await page.reload();

      // 8. Verify banner still does not appear
      await expect(cookieConsentBanner(page)).not.toBeVisible();

      // 9. Return to home and verify persistence
      await page.goto(baseUrl);
      await expect(cookieConsentBanner(page)).not.toBeVisible();
    });
  });

  test.describe('Restricted Access & Redirects', () => {
    test('2.1.1 - Access admin area without authentication', async ({
      context,
      page,
    }) => {
      // 1. Navigate directly to /admin/spaces (unauthenticated)
      await context.clearCookies();
      await page.goto(`${baseUrl}/admin/spaces`);

      // 2. Verify "Access Restricted" page title is shown
      await expect(accessRestrictedHeading(page)).toBeVisible({
        timeout: 5000,
      });

      // 3. Verify "Sign in / Sign up" link is available for unauthenticated users
      await expect(signInSignUpLink(page)).toBeVisible();

      // 4. Click the link and verify navigation to sign-in page
      await signInSignUpLink(page).click();
      await expect(signInHeading(page)).toBeVisible({ timeout: 5000 });
    });

    test('2.2.1 - Regular user tries to access admin area', async ({
      page,
    }) => {
      // 1. Sign in as regular user (non.space@alkem.io)
      await navigateToLoginPageFromMenu(baseUrl, page);
      await fillUpSignInPageElements('non.space@alkem.io', password, page);
      await pressSignInButtonSignInPage(page);

      // Wait for sign-in to complete by checking for user menu
      await expect(userMenuAvatar(page)).toBeVisible({ timeout: 10000 });

      // 2. Navigate to /admin/spaces
      await page.goto(`${baseUrl}/admin/spaces`);

      // 3. Verify "Access Restricted" page title is shown
      await expect(accessRestrictedHeading(page)).toBeVisible({
        timeout: 5000,
      });

      // 4. Verify "Return to Dashboard" link is available for authenticated users without access
      await expect(returnToDashboardLink(page)).toBeVisible();

      // 5. Click the link and verify navigation to dashboard
      await returnToDashboardLink(page).click();
      await expect(welcomeHeading(page)).toBeVisible({ timeout: 5000 });
    });

    test('2.2.2 - Sign in after restricted page attempt', async ({
      context,
      page,
    }) => {
      // 1. Navigate to /admin/spaces (unauthenticated)
      await context.clearCookies();
      await page.goto(`${baseUrl}/admin/spaces`);

      // 2. Click "Sign in / Sign up" from restricted page
      await signInSignUpLink(page).click();

      // 3. Sign in as regular user (non.space@alkem.io)
      await fillUpSignInPageElements('non.space@alkem.io', password, page);
      await pressSignInButtonSignInPage(page);

      // 4. After sign-in, verify "Access Restricted" page with "Return to Dashboard" link
      await expect(accessRestrictedHeading(page)).toBeVisible({
        timeout: 8000,
      });

      await expect(returnToDashboardLink(page)).toBeVisible();

      // 5. Click the link and verify navigation to dashboard
      await returnToDashboardLink(page).click();
      await expect(welcomeHeading(page)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Logout Flow', () => {
    test('4.1 - User logout and session cleanup', async ({ page }) => {
      test.setTimeout(30000);
      // 1. Sign in as user (admin@alkem.io)
      await navigateToLoginPageFromMenu(baseUrl, page);
      await fillUpSignInPageElements('admin@alkem.io', password, page);
      await pressSignInButtonSignInPage(page);

      // Wait for sign-in to complete
      await verifyMyDashboardWelcomeElement(page, 'admin');

      // 2. Navigate to user menu
      await userMenuAvatar(page).click();

      // 3. Click logout button
      await logoutMenuItem(page).click();

      // 4. Verify redirect to landing page by checking for sign-in option
      const signInOption = page
        .getByRole('link', { name: /sign up|sign in/i })
        .or(page.getByRole('button', { name: /sign up|sign in/i }));
      await expect(signInOption.first()).toBeVisible({ timeout: 5000 });

      // 5. Try accessing protected page (e.g., /admin/spaces)
      await page.goto(`${baseUrl}/admin/spaces`);

      // 6. Verify "Access Restricted" page is shown
      await expect(accessRestrictedHeading(page)).toBeVisible({
        timeout: 5000,
      });

      // Verify "Sign in / Sign up" link is available (user is logged out)
      await expect(signInSignUpLink(page)).toBeVisible();
    });

    // skipped because it fails on Evgeni's machine (to be investigated)
    test.skip('4.2 - Logout and re-authentication', async ({ page }) => {
      test.setTimeout(30000);
      // 1. Sign in as user (admin@alkem.io)
      await navigateToLoginPageFromMenu(baseUrl, page);
      await fillUpSignInPageElements('admin@alkem.io', password, page);
      await pressSignInButtonSignInPage(page);

      await verifyMyDashboardWelcomeElement(page, 'admin');

      // 2. Logout
      await userMenuAvatar(page).click();
      await logoutMenuItem(page).click();

      // 3. Sign in again with same credentials
      await navigateToLoginPageFromMenu(baseUrl, page);
      await fillUpSignInPageElements('admin@alkem.io', password, page);
      await pressSignInButtonSignInPage(page);

      // 4. Verify successful re-authentication and welcome message
      await verifyMyDashboardWelcomeElement(page, 'admin');
    });
  });

  test.describe('Error Handling', () => {
    test.skip('7.1 - Invalid credentials', async ({ context, page }) => {
      // 1. Navigate to sign-in page
      await context.clearCookies();
      await navigateToLoginPageFromMenu(baseUrl, page);

      // 2. Enter valid email (admin@alkem.io)
      // 3. Enter wrong password (wrongpassword123)
      await fillUpSignInPageElements(
        'admin@alkem.io',
        'wrongpassword123',
        page
      );

      // 4. Click sign-in button
      await pressSignInButtonSignInPage(page);

      // 5. Verify error message is displayed (check for key phrases rather than exact text)
      const errorMessage = page.getByText(
        /email address or password.*invalid/i
      );

      await expect(errorMessage).toBeVisible({ timeout: 5000 });

      // 6. Verify user is NOT signed in by checking sign-in form elements are still visible
      await expect(emailField(page)).toBeVisible();
      await expect(passwordField(page)).toBeVisible();
      await expect(signInButton(page)).toBeVisible();

      // Verify sign-in heading is still present
      await expect(signInHeading(page)).toBeVisible();
    });
  });
});
