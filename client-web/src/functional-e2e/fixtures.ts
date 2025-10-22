import { test as base, Page, BrowserContext } from '@playwright/test';
import { loginWithEnvCredentials } from './authentication/auth-helpers';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';

let scenarioData: any;
// Define the types for your custom fixtures
type MyFixtures = {
  scenarioData: any;
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
};

// Extend base test with custom fixtures
export const test = base.extend<MyFixtures>({
  // Fixture for authenticated page
  authenticatedPage: async ({ browser }, use) => {
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
      scenarioData =
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

      // // Optional: Cleanup after all tests in this worker
      // await TestScenarioFactory.cleanUpBaseScenario(scenarioData);
    },
    { scope: 'worker' },
  ], // This fixture is scoped to worker (runs once per parallel worker)

  // Fixture for authenticated context (if you need multiple pages)
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Perform authentication
    await loginWithEnvCredentials(page, { verify: true });

    // Use the authenticated context in tests
    await use(context);

    // Cleanup
    await page.close();
    await context.close();
    // // Optional: Cleanup after all tests in this worker
    await TestScenarioFactory.cleanUpBaseScenario(scenarioData);
  },
});

export { expect } from '@playwright/test';
