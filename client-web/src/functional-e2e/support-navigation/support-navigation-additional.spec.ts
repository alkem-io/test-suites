// spec: client-web/src/functional-e2e/plans/support-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-docs.spec.ts

import { expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'support-navigation-additional.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

test.describe('Support Navigation Additional Tests', () => {
  test.beforeAll(async ({ browser }) => {
    test.setTimeout(60_000);
    const userEmail =
      TestUserManager?.users?.nonSpaceMember?.email ||
      TestUserManager?.users?.globalAdmin?.email ||
      'admin@alkem.io';

    await setupAuthentication(browser, userEmail);
  });

  test.afterAll(async () => {
    await teardownAuthentication();
  });

  test.describe('Support Dialog', () => {
    test('Close Support Dialog', async ({ page }) => {
      test.setTimeout(60_000);
      // Ensure we are on the dashboard
      await page.goto(baseUrl);

      // 1. From dashboard, click "Support" in footer
      await page.getByText('Support').click();

      // 2. Verify support dialog opens
      await expect(
        page.getByRole('heading', { name: 'Looking for help?' })
      ).toBeVisible();

      // 3. Click Close button (X icon)
      await page.getByRole('button', { name: 'Close' }).click();

      // 4-5. Verify dialog closes and dashboard is still visible
      await expect(
        page.getByRole('heading', { name: 'Welcome, admin!' })
      ).toBeVisible();
    });
  });

  test.describe('Documentation Page', () => {
    test('Direct Documentation Access', async ({ page }) => {
      // 1. Navigate directly to /docs
      await page.goto(`${baseUrl}/docs`);

      // 2. Verify documentation page loads with "Documentation" heading
      await expect(
        page.getByRole('heading', { name: 'Documentation' })
      ).toBeVisible();

      // 3. Verify iframe with documentation content is visible
      const iframe = page.locator('iframe[title="Documentation"]');
      await expect(iframe).toBeVisible();
    });

    test('Navigate Back to Dashboard from Documentation', async ({ page }) => {
      test.setTimeout(30_000);
      // 1. Navigate directly to /docs
      await page.goto(`${baseUrl}/docs`);

      // 2. Wait for documentation page to load
      await page
        .getByText('Documentation')
        .first()
        .waitFor({ state: 'visible' });
      await expect(
        page.getByRole('heading', { name: 'Documentation' })
      ).toBeVisible();

      // 3. Click "My Dashboard" link
      await page.getByRole('link', { name: 'My Dashboard' }).click();

      // 4. Verify return to dashboard with welcome message
      await expect(
        page.getByRole('heading', { name: 'Welcome, admin!' })
      ).toBeVisible();
    });
  });
});
