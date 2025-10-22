import { test as base, Page, BrowserContext } from '@playwright/test';
import { loginWithEnvCredentials } from './authentication/auth-helpers';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
// Define the types for your custom fixtures
type MyFixtures = {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
  scenarioData: any;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
  // Fixture for scenario data (shared across tests in a worker)
  scenarioData: [
    async (
      {},
      use: (r: any) => Promise<void>,
      workerInfo: { workerIndex: number }
    ) => {
      // This runs once per worker (parallel process)
      const scenarioConfig: TestScenarioConfig = {
        name: `playwright-agents-scenario-worker-${workerInfo.workerIndex}`,
        space: {
          collaboration: {
            addPostCollectionCallout: true,
            addTutorialCallouts: false,
          },
          community: {
            admins: [TestUser.SPACE_ADMIN],
            members: [TestUser.SPACE_MEMBER],
          },
        },
      };

      // Create the scenario once per worker
      const scenarioData =
        await TestScenarioFactory.createBaseScenario(scenarioConfig);
      console.log(
        `Scenario setup completed for worker ${workerInfo.workerIndex}`
      );
      console.log('Created scenario:', {
        name: scenarioConfig.name,
        hasData: !!scenarioData,
      });

      // Make scenario data available to all tests in this worker
      await use(scenarioData);

      // Cleanup after all tests in this worker finish
      console.log(
        `Cleaning up scenario data for worker ${workerInfo.workerIndex}`
      );
      await TestScenarioFactory.cleanUpBaseScenario(scenarioData);
      console.log(
        `Scenario cleanup completed for worker ${workerInfo.workerIndex}`
      );
    },
    { scope: 'worker' },
  ], // This fixture is scoped to worker (runs once per parallel worker)

  // Fixture for authenticated page
  // Depends on scenarioData to ensure scenario is created before browser opens
  authenticatedPage: async ({ browser, scenarioData }, use) => {
    // Wait for scenarioData to be ready (happens automatically via dependency)
    console.log('Browser opening after scenario data is ready');

    // Create a new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Perform authentication
    await loginWithEnvCredentials(page, { verify: true });

    // Use the authenticated page in tests
    await use(page);

    // Cleanup
    await page.close();
    await context.close();
  },

  // Fixture for authenticated context (if you need multiple pages)
  // Depends on scenarioData to ensure scenario is created before browser opens
  authenticatedContext: async ({ browser, scenarioData }, use) => {
    // Wait for scenarioData to be ready (happens automatically via dependency)
    console.log('Browser context opening after scenario data is ready');

    const context = await browser.newContext();
    const page = await context.newPage();

    // Perform authentication
    await loginWithEnvCredentials(page, { verify: true });

    // Use the authenticated context in tests
    await use(context);

    // Cleanup
    await page.close();
    await context.close();
  },
});

export { expect } from '@playwright/test';
