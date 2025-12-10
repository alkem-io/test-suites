import { test as base, Page } from '@playwright/test';

import {
  TestScenarioConfig,
  TestUser,
  TestScenarioFactory,
} from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

let baseScenario: OrganizationWithSpaceModel;

const scenarioConfig: TestScenarioConfig = {
  name: 'seed-space-admin',
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },

    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [
        TestUser.SPACE_MEMBER,
        TestUser.SPACE_ADMIN,
        TestUser.SUBSPACE_MEMBER,
        TestUser.SUBSPACE_ADMIN,
        TestUser.SUBSUBSPACE_MEMBER,
        TestUser.SUBSUBSPACE_ADMIN,
      ],
    },
  },
};

base.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});

base.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// Fixture: Ensure space admin is logged in
export const test = base.extend<{ spaceAdminLoggedIn: Page }>({
  spaceAdminLoggedIn: async ({ page }, use) => {
    // Navigate to home page
    await page.goto(baseUrl);

    // Accept cookies if present
    await page.getByRole('button', { name: 'Accept All Cookies' }).click();

    // Open login menu
    await page.getByTestId('PersonIcon').click();
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
    await page.waitForURL(/.*login.*/);

    // Login as space admin
    await page.getByRole('textbox', { name: 'E-Mail' }).fill('space.admin@alkem.io');
    await page.getByRole('textbox', { name: 'Password' }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/.*home.*/);

    // Save authentication state for subsequent tests
    await page.context().storageState({ path: '.auth/space-admin.json' });

    // Use the logged-in page in tests
    await use(page);
  },
});
