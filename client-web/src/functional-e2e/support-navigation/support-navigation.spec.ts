// spec: specs/plans/support-navigation-test-plan.md
// seed: client-web/src/functional-e2e/seed-docs.spec.ts
// NOTE: In order to run these tests locally, documentations service must be running:
// Loading an Iframe of documentation site
// to run it locally
// checkout the documentation repo: https://github.com/alkem-io/documentation
// and follow its readme to run it locally;
// update your local .env server file with PLATFORM_DOCUMENTATION_PATH=http://localhost:3010/documentation

import { expect } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUserManager,
} from '@alkemio/tests-lib';
import { createAuthenticatedSessionFixture } from '../fixtures/authenticated-session.fixture';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'support-navigation.json',
    cleanupAfterTests: process.env.cleanupAfterTests === 'true',
  });

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'support-navigation',
};

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  const userEmail =
    TestUserManager?.users?.nonSpaceMember?.email || 'admin@alkem.io';
  await setupAuthentication(browser, userEmail);
});

test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
  await teardownAuthentication();
});

test.describe('Support Navigation Flow', () => {
  test('Complete Support Journey - Dashboard to Documentation to Inviting Tutorial and Back', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto(`${baseUrl}/home`);

    // 1. From dashboard, click "Support" link in footer to open support dialog
    await page.getByText('Support').click();

    // 2. Verify support dialog opens with "Looking for help?" heading
    await expect(
      page.getByRole('heading', { name: 'Looking for help?' })
    ).toBeVisible();

    // 3. Click "Explore Documentation" button
    // Register the waiter before the click: context.waitForEvent does not
    // buffer, so a tab that opens before the listener is attached is missed.
    const pagePromise = page.context().waitForEvent('page');
    await page.getByRole('link', { name: 'Explore Documentation' }).click();
    const newPage = await pagePromise;
    await newPage.waitForURL(/.*docs.*/);

    // 4. Verify documentation page loads at /docs. CRD renders the docs as an
    // embedded iframe (title "Alkemio documentation") with no outer
    // "Documentation" heading; assert the iframe content rendered.
    const docsFrame = newPage.frameLocator(
      'iframe[title="Alkemio documentation"]'
    );
    await expect(
      docsFrame.getByRole('heading', { name: 'Welcome to Alkemio Docs' })
    ).toBeVisible({ timeout: 15000 });

    // 5. Return to dashboard using the original page
    await page.bringToFront();
    await page.goto(`${baseUrl}/home`);

    // 6. Verify return to dashboard
    await verifyMyDashboardWelcomeElement(page);
  });
});
