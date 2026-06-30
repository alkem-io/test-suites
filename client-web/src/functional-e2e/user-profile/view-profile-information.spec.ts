// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// seed: seed-minimal.spec.js

import { test, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD!;
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('My Profile Tab - View and Edit', () => {
  test('View Profile Information', async ({ page }) => {
    // Seed: Login
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

    // Navigate to the Profile settings tab
    await page.goto(`${baseUrl}/user/admin-alkemio/settings/profile`);

    // CRD redesigns this surface as an inline-edit settings page:
    //  - identity fields (Display/First/Last Name, Phone, Tagline) are now
    //    inline-edit buttons that open a popover, not textboxes
    //  - the avatar editor is "Change Avatar" under a "Profile Picture" heading
    //  - Bio is a rich-text editor exposed as the "Formatting toolbar" textbox
    //  - the legacy "Full Name" field and bottom "Save" button no longer exist
    //    (each field auto-saves via its popover)

    // 1. Verify the avatar editor is displayed
    await expect(
      page.getByRole('heading', { name: 'Profile Picture' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Change Avatar' })
    ).toBeVisible();

    // 2. Verify identity inline-edit fields are visible
    await expect(
      page.getByRole('button', { name: 'Display Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'First Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Last Name' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phone' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tagline' })).toBeVisible();

    // 3. Verify City textbox is visible
    await expect(page.getByRole('textbox', { name: 'City' })).toBeVisible();

    // 3. Verify Country field is visible (CRD renders it as an unnamed
    // combobox under a "Country" label; assert via the label text).
    await expect(page.getByText('Country', { exact: true })).toBeVisible();

    // 3. Verify Bio rich-text editor is visible
    await expect(
      page.getByRole('textbox', { name: 'Formatting toolbar' })
    ).toBeVisible();

    // 3. Verify Skills section input is visible
    await expect(
      page.getByRole('textbox', {
        name: 'e.g. UX research, TypeScript, facilitation',
      })
    ).toBeVisible();

    // 3. Verify social link textboxes are visible
    await expect(
      page.getByRole('textbox', { name: 'LinkedIn' })
    ).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Bluesky' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'GitHub' })).toBeVisible();

    // 3. Verify Email textbox is visible
    await expect(page.getByRole('textbox', { name: 'Email' })).toBeVisible();

    // 3. Verify Add Reference button is visible
    await expect(
      page.getByRole('button', { name: 'Add another reference' })
    ).toBeVisible();

    // 3. Verify References section shows no references message
    await expect(page.getByText('No references yet')).toBeVisible();
  });
});
