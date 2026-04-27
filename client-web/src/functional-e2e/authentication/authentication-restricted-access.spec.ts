import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import {
  accessRestrictedHeading,
  returnToDashboardLink,
  signInHeading,
  signInSignUpLink,
  userMenuAvatar,
  welcomeHeading,
} from './common-authentication-page-elements';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD ?? '';
const baseUrl = process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000';

/** @testCase TC-1607, TC-1608 */
test.describe('Authentication - Restricted Access', () => {
  test('unauthenticated user accessing admin area sees restricted page', async ({
    context,
    page,
  }) => {
    // Clear cookies to ensure unauthenticated state
    await context.clearCookies();

    // Navigate directly to /admin/spaces (unauthenticated)
    await page.goto(`${baseUrl}/admin/spaces`);

    // Verify "Access Restricted" page title is shown
    await expect(accessRestrictedHeading(page)).toBeVisible({ timeout: 5000 });

    // Verify "Sign in / Sign up" link is available for unauthenticated users
    await expect(signInSignUpLink(page)).toBeVisible();
  });

  test('unauthenticated user can navigate to sign-in from restricted page', async ({
    context,
    page,
  }) => {
    await context.clearCookies();
    await page.goto(`${baseUrl}/admin/spaces`);

    // Click the sign in link
    await signInSignUpLink(page).click();

    // Verify navigation to sign-in page
    await expect(signInHeading(page)).toBeVisible({ timeout: 5000 });
  });

  test('regular user accessing admin area sees restricted page with dashboard link', async ({
    context,
    page,
  }) => {
    await context.clearCookies();

    // Sign in as regular user (non.space@alkem.io)
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('non.space@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // Wait for sign-in to complete by checking for user menu
    await expect(userMenuAvatar(page)).toBeVisible({ timeout: 10000 });

    // Navigate to /admin/spaces
    await page.goto(`${baseUrl}/admin/spaces`);

    // Verify "Access Restricted" page title is shown
    await expect(accessRestrictedHeading(page)).toBeVisible({ timeout: 5000 });

    // Verify "Return to Dashboard" link is available for authenticated users without access
    await expect(returnToDashboardLink(page)).toBeVisible();
  });

  test('regular user can return to dashboard from restricted page', async ({
    context,
    page,
  }) => {
    await context.clearCookies();

    // Sign in as regular user
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('non.space@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);
    await expect(userMenuAvatar(page)).toBeVisible({ timeout: 10000 });

    // Navigate to restricted admin area
    await page.goto(`${baseUrl}/admin/spaces`);
    await expect(accessRestrictedHeading(page)).toBeVisible({ timeout: 5000 });

    // Click return to dashboard link
    await returnToDashboardLink(page).click();

    // Verify navigation to dashboard
    await expect(welcomeHeading(page)).toBeVisible({ timeout: 5000 });
  });

  test('sign in after restricted page attempt redirects back to restricted page', async ({
    context,
    page,
  }) => {
    await context.clearCookies();

    // Navigate to /admin/spaces (unauthenticated)
    await page.goto(`${baseUrl}/admin/spaces`);

    // Click "Sign in / Sign up" from restricted page
    await signInSignUpLink(page).click();

    // Sign in as regular user (non.space@alkem.io)
    await fillUpSignInPageElements('non.space@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);

    // After sign-in, verify "Access Restricted" page with "Return to Dashboard" link
    await expect(accessRestrictedHeading(page)).toBeVisible({ timeout: 8000 });
    await expect(returnToDashboardLink(page)).toBeVisible();
  });
});
