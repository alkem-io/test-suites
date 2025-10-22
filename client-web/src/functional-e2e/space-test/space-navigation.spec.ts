import { test, expect } from '../fixtures';
import {
  TestScenarioConfig,
  TestScenarioFactory,
  TestUser,
} from '@alkemio/tests-lib';

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

test.describe('Space Test', () => {
  test.beforeAll(async () => {
    // Create base scenario with space and test data
    await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
    console.log('Space test scenario setup completed');
  });

  test('navigate to space', async ({ authenticatedPage }) => {
    // Use the authenticatedPage fixture which is already logged in
    
    // Navigate to created space - this should now have data from the scenario
    const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
    await authenticatedPage.goto(baseUrl);
    await authenticatedPage.waitForLoadState('networkidle');
    
    // Add your test assertions here
    await expect(authenticatedPage.locator('body')).toContainText('Welcome');
  });
});
