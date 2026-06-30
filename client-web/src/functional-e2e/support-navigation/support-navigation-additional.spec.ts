// spec: client-web/src/functional-e2e/plans/support-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-docs.spec.ts
// NOTE: In order to run these tests locally, documentations service must be running:
// Loading an Iframe of documentation site
// to run it locally
// checkout the documentation repo: https://github.com/alkem-io/documentation
// and follow its readme to run it locally;
// update your local .env server file with PLATFORM_DOCUMENTATION_PATH=http://localhost:3010/documentation

import { expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';

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
      await verifyMyDashboardWelcomeElement(page);
    });
  });

  test.describe('Documentation Page', () => {
    test('Direct Documentation Access', async ({ page }) => {
      // 1. Navigate directly to /docs
      await page.goto(`${baseUrl}/docs`);

      // 2. Verify documentation page loads. CRD no longer renders an outer
      // "Documentation" heading on the /docs page; the page is the embedded
      // documentation iframe. Assert the iframe (CRD title "Alkemio
      // documentation") is present and its content loaded.
      const iframe = page.locator('iframe[title="Alkemio documentation"]');
      await expect(iframe).toBeVisible({ timeout: 15000 });

      // 3. Verify the documentation content rendered inside the iframe
      const docsFrame = page.frameLocator(
        'iframe[title="Alkemio documentation"]'
      );
      await expect(
        docsFrame.getByRole('heading', { name: 'Welcome to Alkemio Docs' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('Navigate Back to Dashboard from Documentation', async ({ page }) => {
      test.setTimeout(30_000);
      // 1. Navigate directly to /docs
      await page.goto(`${baseUrl}/docs`);

      // 2. Wait for documentation page (the embedded iframe) to load
      const iframe = page.locator('iframe[title="Alkemio documentation"]');
      await expect(iframe).toBeVisible({ timeout: 15000 });

      // 3. Navigate back to the dashboard. CRD removed the "My Dashboard" link
      // from the /docs page; the Alkemio header "Home" logo link (→ /home) is
      // the return-to-dashboard affordance.
      await page.getByRole('link', { name: 'Home' }).first().click();
      await page.waitForURL(/.*\/home.*/, { timeout: 15000 });

      // 4. Verify return to dashboard
      await verifyMyDashboardWelcomeElement(page);
    });
  });
});
