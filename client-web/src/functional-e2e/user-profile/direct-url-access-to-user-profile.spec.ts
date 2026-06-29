// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Navigation and Access', () => {
  test('Direct URL Access to User Profile', async ({ page }) => {
    // Seed: Login (CRD header uses a direct "Log in" link)
    await page.goto(baseUrl);
    const cookieButton = page.getByRole('button', {
      name: 'Accept All Cookies',
    });
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButton.click();
    }
    const loginLink = page.getByRole('link', { name: 'Log in', exact: true });
    await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
    await loginLink.click();
    await page.waitForURL(/.*login.*/);
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL(/.*home.*/);
    const switchToNewDesign = page.getByRole('button', {
      name: /take me to the new design/i,
    });
    if (
      await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)
    ) {
      await switchToNewDesign.click().catch(() => {});
    }

    // 1. Navigate directly to /user/admin-alkemio/settings/profile
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // Verify the "Profile" tab is active (CRD renames "My profile").
    await expect(page.getByRole('tab', { name: 'Profile' })).toBeVisible();

    // CRD renders the name fields as inline-edit buttons (popover editors)
    // instead of textboxes, and removes the bottom "Save" button (each field
    // auto-saves via its popover).
    await expect(
      page.getByRole('button', { name: 'First Name' })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Last Name' })
    ).toBeVisible();
  });
});
