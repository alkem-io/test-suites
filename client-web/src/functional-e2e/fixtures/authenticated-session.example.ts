// Example: How to use the authenticated session fixture in your tests

import { expect } from '@playwright/test';
import {
  TestScenarioConfig,
  TestUser,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { createAuthenticatedSessionFixture } from '@src/functional-e2e/fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
let baseScenario: OrganizationWithSpaceModel;

// Create the authenticated fixture with a unique storage state name for this test suite
const { test, setupAuthentication, teardownAuthentication } =
  createAuthenticatedSessionFixture({
    storageStateName: 'my-feature-test.json',
  });

const scenarioConfig: TestScenarioConfig = {
  name: 'my-feature-' + Date.now(),
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_MEMBER],
    },
  },
};

test.describe('My Feature Tests', () => {
  test.beforeAll(async ({ browser }) => {
    // Set up your test scenario
    baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

    // Set up authentication (logs in and saves session)
    await setupAuthentication(browser, 'space.admin@alkem.io');
  });

  test.afterAll(async () => {
    // Clean up authentication
    await teardownAuthentication();
  });

  test('should do something while authenticated', async ({ page }) => {
    // The page fixture is already authenticated and reuses the same browser
    await page.goto(`${baseUrl}/${baseScenario.space.nameId}`);

    // Your test logic here...
    await expect(page.getByRole('tab', { name: 'Settings' })).toBeVisible();
  });

  test('another test in the same session', async ({ page }) => {
    // This test also uses the same authenticated browser session
    await page.goto(`${baseUrl}/home`);

    // Your test logic here...
  });
});
