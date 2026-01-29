// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { delay } from '@alkemio/tests-lib/utils/delay';
import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('My Profile Tab - View and Edit', () => {
  let originalFirstName: string;
  let originalLastName: string;

  test('Update Basic Information', async ({ page }) => {
    // Seed: Login
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();
    await delay(1000); // inconsistency in passing locally
    await page.getByTestId('PersonIcon').click({ timeout: 500 });
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click({
      timeout: 500,
    });
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/);

    // Navigate to My profile tab
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // Store original values for cleanup
    originalFirstName = await page
      .getByRole('textbox', { name: 'First Name' })
      .inputValue();
    originalLastName = await page
      .getByRole('textbox', { name: 'Last name' })
      .inputValue();

    // 1-4. Update First Name and Last name fields
    await page
      .getByRole('textbox', { name: 'First Name' })
      .fill('TestFirstName');
    await page.getByRole('textbox', { name: 'Last name' }).fill('TestLastName');

    // 6. Click Save button
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify success notification appears
    await expect(page.getByText('User updated successfully')).toBeVisible();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup: Revert changes to original values if they were modified
    if (originalFirstName && originalLastName) {
      await page.goto(
        'http://localhost:3000/user/admin-alkemio/settings/profile'
      );
      await page
        .getByRole('textbox', { name: 'First Name' })
        .fill(originalFirstName);
      await page
        .getByRole('textbox', { name: 'Last name' })
        .fill(originalLastName);
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('User updated successfully')).toBeVisible();
    }
  });
});
