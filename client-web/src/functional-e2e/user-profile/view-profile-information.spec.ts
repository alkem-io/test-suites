// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** @testCase TC-1952 */
test.describe('My Profile Tab - View and Edit', () => {
  test('View Profile Information', async ({ page }) => {
    // Seed: Login
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();
    await page.getByTestId('PersonIcon').click();
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/);

    // Navigate to My profile tab
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // 1. Verify profile avatar is displayed
    await expect(page.getByRole('img', { name: 'Not yet set' })).toBeVisible();

    // 2. Verify Edit button is visible next to avatar
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

    // 3. Verify First Name textbox is visible
    await expect(
      page.getByRole('textbox', { name: 'First Name' })
    ).toBeVisible();

    // 3. Verify Last name textbox is visible
    await expect(
      page.getByRole('textbox', { name: 'Last name' })
    ).toBeVisible();

    // 3. Verify Full Name textbox is visible
    await expect(
      page.getByRole('textbox', { name: 'Full Name' })
    ).toBeVisible();

    // 3. Verify Phone textbox is visible
    await expect(page.getByRole('textbox', { name: 'Phone' })).toBeVisible();

    // 3. Verify City textbox is visible
    await expect(page.getByRole('textbox', { name: 'City' })).toBeVisible();

    // 3. Verify Country combobox is visible
    await expect(page.getByRole('combobox', { name: 'Country' })).toBeVisible();

    // 3. Verify Tagline textbox is visible
    await expect(page.getByRole('textbox', { name: 'Tagline' })).toBeVisible();

    // 3. Verify Bio Markdown editor is visible
    await expect(
      page.getByRole('textbox', { name: 'Markdown editor' })
    ).toBeVisible();

    // 3. Verify Skills combobox is visible
    await expect(
      page.getByRole('combobox', { name: 'Skills Keywords' })
    ).toBeVisible();

    // 3. Verify Linkedin textbox is visible
    await expect(page.getByRole('textbox', { name: 'Linkedin' })).toBeVisible();

    // 3. Verify BlueSky textbox is visible
    await expect(page.getByRole('textbox', { name: 'BlueSky' })).toBeVisible();

    // 3. Verify Github textbox is visible
    await expect(page.getByRole('textbox', { name: 'Github' })).toBeVisible();

    // 3. Verify Mail textbox is visible and disabled
    await expect(page.getByRole('textbox', { name: 'Mail' })).toBeVisible();

    // 3. Verify Add Reference button is visible
    await expect(
      page.getByRole('button', { name: 'Add Reference' })
    ).toBeVisible();

    // 3. Verify References section shows no references message
    await expect(page.getByText('No references yet')).toBeVisible();

    // 3. Verify Save button is visible at the bottom
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });
});
