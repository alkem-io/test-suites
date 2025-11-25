// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// Test: 1.1 Access User Profile from Dashboard

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Navigation and Access', () => {
  test('1.1 Access User Profile from Dashboard', async ({ page }) => {
    // Navigate to home page
    await page.goto(baseUrl);

    // Accept cookies
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();

    // 1. Click the user icon in the top navigation bar
    await page.getByTestId('PersonIcon').click();

    // Click login menu item
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();

    // Wait for login page
    await page.waitForURL(/.*login.*/);

    // Login
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Wait for dashboard
    await page.waitForURL(/.*home.*/);
    await expect(page.getByText(/Welcome, admin!/i)).toBeVisible();

    // 2. Click "My Account" from the dropdown menu
    await page.getByRole('link', { name: 'My Account' }).click();

    // 3. Verify user is redirected to account settings page
    await page.waitForURL(/.*\/user\/.*\/settings\/account/);
    await expect(page).toHaveURL(/.*\/user\/admin-alkemio\/settings\/account/);

    // Verify user settings page loads with account tab active
    await expect(page.getByRole('tab', { name: 'account' })).toBeVisible();

    // Verify page banner displays user's avatar and name
    await expect(
      page.getByRole('heading', { name: 'admin alkemio', level: 1 })
    ).toBeVisible();

    // 4. Verify all six tabs are visible
    await expect(page.getByRole('tab', { name: 'My profile' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'account' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'membership' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'organizations' })
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'notifications' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'settings' })).toBeVisible();
  });
});
