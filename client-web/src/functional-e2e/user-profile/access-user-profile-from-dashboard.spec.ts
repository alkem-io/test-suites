// spec: client-web/src/functional-e2e/user-profile-test-plan.md
// Test: 1.1 Access User Profile from Dashboard

import { expect } from '@playwright/test';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const test = createPersonaTest('admin@alkem.io');

test.describe('Navigation and Access', () => {
  test('1.1 Access User Profile from Dashboard', async ({ page }) => {
    // Already authenticated as admin via the shared persona session; land on the
    // home dashboard.
    await page.goto(baseUrl);

    await verifyMyDashboardWelcomeElement(page);

    // 2. Click "My Account" from the dropdown menu
    await page.getByRole('link', { name: 'My Account' }).click();

    // 3. Verify user is redirected to account settings page
    await page.waitForURL(/.*\/user\/.*\/settings\/account/);
    await expect(page).toHaveURL(/.*\/user\/admin-alkemio\/settings\/account/);

    // Verify user settings page loads with account tab active. Use the default
    // expect timeout rather than a 500ms one — the settings page is slower to
    // render on the test env and the tight bound flaked there.
    await expect(page.getByRole('tab', { name: 'account' })).toBeVisible();

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
