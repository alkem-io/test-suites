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
    await page.getByRole('link', { name: 'Explore Documentation' }).click();

    // Wait for the new tab to open and switch to it
    const newPage = await page.context().waitForEvent('page');
    await newPage.waitForURL(/.*docs.*/);

    // 4. Verify documentation page loads at /docs with "Documentation" heading
    await expect(
      newPage.getByRole('heading', { name: 'Documentation' })
    ).toBeVisible();

    // 5. Navigate to "How to..." section and click "Inviting People to a Space"
    const docsFrame = newPage.frameLocator('iframe[title="Documentation"]');
    await docsFrame
      .getByRole('link', { name: 'Inviting People to a Space' })
      .click();

    // 6. Verify page navigates to /docs/how-to/inviting
    await expect(newPage).toHaveURL(/.*docs\/how-to\/inviting.*/);

    // [BUG] no embeded arcade iframe in the docs on test env
    // 7. Inside the embedded invite tutorial iframe, click "Get started"
    // const inviteFrame = docsFrame.frameLocator('iframe');
    // await expect(inviteFrame.getByText('Get started')).toBeVisible();
    // await inviteFrame.getByText('Get started').click();

    // 8. Return to dashboard using the original page (more stable than clicking inside docs tab)
    await page.bringToFront();
    await page.goto(`${baseUrl}/home`);

    // 9. Verify return to dashboard with welcome message
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Welcome'
    );
  });
});
