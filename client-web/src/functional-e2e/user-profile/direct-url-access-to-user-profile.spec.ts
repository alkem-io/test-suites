// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** @testCase TC-1951 */
test.describe('Navigation and Access', () => {
  test('Direct URL Access to User Profile', async ({ page }) => {
    // Seed: Login
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();
    await page.getByTestId('PersonIcon').click({ timeout: 500 });
    await page
      .getByRole('menuitem', { name: 'Log In | Sign Up' })
      .click({ timeout: 500 });
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/);

    // 1. Navigate directly to /user/admin-alkemio/settings/profile
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // Verify "My profile" tab is active
    await expect(page.getByRole('tab', { name: 'My profile' })).toBeVisible();

    // Verify First Name textbox is visible
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeVisible();

    // Verify Last name textbox is visible
    await expect(
      page.getByRole('textbox', { name: 'Last name' })
    ).toBeVisible();

    // Verify Save button is visible
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});
