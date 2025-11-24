//const { test } = require('@playwright/test');
import { test, expect } from '@playwright/test';

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
  name: 'seed-minimal',
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
test.beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
});
test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});
test('seed', async ({ page }) => {
  await page.goto(baseUrl);
  await page.getByRole('button', { name: 'Accept All Cookies' }).click();
  await page.getByTestId('PersonIcon').click();
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail' }).fill('admin@alkem.io');
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/.*home.*/);
});
