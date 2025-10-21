import { test } from '@playwright/test';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';
import { loginWithEnvCredentials } from '../authentication/auth-helpers';

const scenarioConfig: TestScenarioConfig = {
  name: 'space-test-scenario',
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

test.describe('Space Test Seed', () => {
  test.beforeAll(async () => {
    // Create base scenario with space and test data
    await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
    console.log('Space test scenario setup completed');
  });

  test('seed - navigate to space', async ({ page }) => {
    // Authenticate user
    await loginWithEnvCredentials(page, { verify: true });
    
    // Navigate to created space - this should now have data from the scenario
    const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl);
    await page.waitForLoadState('networkidle');
  });
});
