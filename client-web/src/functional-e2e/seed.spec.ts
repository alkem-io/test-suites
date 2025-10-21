import {
  testConfiguration,
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { test, expect } from '@playwright/test';
import { TabsPage } from './authentication/TabsPage';
import { loginWithEnvCredentials } from './authentication/auth-helpers';
const baseUrl = `${testConfiguration.endPoints.server}/`; //'https://dev-alkem.io/checkdefaultcallouts';

const scenarioConfig: TestScenarioConfig = {
  name: 'check-playwright-agents',
  space: {
    collaboration: {
      addPostCollectionCallout: true,
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
    },
  },
};

test.beforeAll(async ({ page }) => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  console.log('Scenario setup completed');
  await loginWithEnvCredentials(page, { verify: true });
});

test.describe('Test group', () => {
  let tabsPage: TabsPage;

  test.beforeEach(async ({ page }) => {
    tabsPage = new TabsPage(page);
    await page.goto(baseUrl);
  });

  test('seed', async ({ page }) => {
    // Additional seeding steps can be added here after successful login.
    // await expect(
    //   page.getByRole('button', { name: 'Invitations' })
    // ).toBeVisible();
  });
});
