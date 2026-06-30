// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// Test: 1.1 Access User Profile from Dashboard

import { delay } from '@alkemio/tests-lib';
import { test, expect } from '@playwright/test';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Navigation and Access', () => {
  test('1.1 Access User Profile from Dashboard', async ({ page }) => {
    // Navigate to home page
    await page.goto(baseUrl);

    // Accept cookies (CRD cookie banner may not always appear)
    const cookieButton = page.getByRole('button', {
      name: 'Accept All Cookies',
    });
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButton.click();
    }

    // 1. CRD header exposes a direct "Log in" link (replacing the MUI
    // PersonIcon menu + "Log In | Sign Up" menu item).
    const loginLink = page.getByRole('link', { name: 'Log in', exact: true });
    await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
    await loginLink.click();

    // Wait for login page
    await page.waitForURL(/.*login.*/);

    // Login
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page
      .getByRole('button', { name: 'Sign in', exact: true })
      .click({ timeout: 500 });

    // Wait for dashboard
    await page.waitForURL(/.*home.*/);

    // Dismiss the one-time "A fresh new Alkemio is here" design dialog.
    const switchToNewDesign = page.getByRole('button', {
      name: /take me to the new design/i,
    });
    if (
      await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await switchToNewDesign.click().catch(() => {});
    }

    await verifyMyDashboardWelcomeElement(page);

    // 2. Click "My Account" from the dropdown menu
    await page.getByRole('link', { name: 'My Account' }).click();

    // 3. Verify user is redirected to account settings page
    await page.waitForURL(/.*\/user\/.*\/settings\/account/);
    await expect(page).toHaveURL(/.*\/user\/admin-alkemio\/settings\/account/);

    // Verify user settings page loads with account tab active
    await expect(page.getByRole('tab', { name: 'account' })).toBeVisible({
      timeout: 500,
    });

    // Verify page banner displays user's avatar and name
    await expect(
      page.getByRole('heading', { name: 'admin alkemio', level: 1 })
    ).toBeVisible();

    // 4. Verify all settings tabs are visible. CRD renames "My profile" ->
    // "Profile" and "organizations" -> "Organisations".
    await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'account' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'membership' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Organisations' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'notifications' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'settings' })).toBeVisible();
  });
});
