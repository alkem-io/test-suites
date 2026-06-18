import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import {
  accessRestrictedHeading,
  goToHomeButton,
  signInHeading,
  signInSignUpLink,
  userMenuAvatar,
  welcomeHeading,
} from './common-authentication-page-elements';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD ?? '';
const baseUrl = process.env.ALKEMIO_BASE_URL ?? 'http://localhost:3000';

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

    // Verify navigation to sign-in page. The CRD sign-in page can be slow to
    // render after navigating away from the restricted page, so allow a
    // generous timeout for the heading to appear.
    await expect(signInHeading(page)).toBeVisible({ timeout: 15000 });
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

    // Verify "Go to Home" action is available for authenticated users without access
    await expect(goToHomeButton(page)).toBeVisible();
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

    // Click "Go to Home" to leave the restricted page
    await goToHomeButton(page).click();

    // Verify navigation to dashboard
    await expect(welcomeHeading(page)).toBeVisible({ timeout: 5000 });
  });

  // Signing in from the restricted-access prompt preserves the returnUrl: the
  // CRD flow returns the now-authenticated user to the originally requested
  // restricted page (/admin/spaces). Because the regular user lacks access,
  // that page renders the authenticated "Access Restricted" variant (with a
  // "Go to Home" button) rather than the unauthenticated one (with the
  // "Sign in / Sign up" link). Assert the user is signed in (header avatar) and
  // is back on that restricted page.
  test('sign in after restricted page attempt returns to restricted page authenticated', async ({
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

    // The user is signed in (header avatar present) and the returnUrl brings
    // them back to the restricted page, now showing the authenticated variant.
    await expect(userMenuAvatar(page)).toBeVisible({ timeout: 12000 });
    await expect(accessRestrictedHeading(page)).toBeVisible({ timeout: 8000 });
    await expect(goToHomeButton(page)).toBeVisible();
  });
});
