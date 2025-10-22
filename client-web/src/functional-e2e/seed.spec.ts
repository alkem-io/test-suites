import { testConfiguration } from '@alkemio/tests-lib';
import { test, expect } from './fixtures';

const baseUrl = `${testConfiguration.endPoints.server}/`;

/**
 * This is the seed file for Playwright Agents.
 * It sets up the initial state and authentication for AI-generated tests.
 * 
 * The fixtures.ts file handles:
 * - Authentication (authenticatedPage fixture)
 * - Scenario setup (scenarioData fixture)
 * 
 * This seed test will be copied into generated tests by the Playwright Agent.
 */
test.describe('Playwright Agents Seed', () => {
  test('seed - authenticated user on home page', async ({ authenticatedPage, scenarioData }) => {
    // The authenticatedPage fixture provides an already logged-in page
    // The scenarioData fixture provides the test scenario with spaces and users
    
    // Navigate to the base URL
    await authenticatedPage.goto(baseUrl);
    await authenticatedPage.waitForLoadState('networkidle');

    // Verify authentication worked
    await expect(authenticatedPage.locator('body')).toContainText('Welcome');
    
    // Add any additional setup or verification here that should be present
    // for all generated tests
    console.log('Seed completed - authenticated and ready for agent exploration');
    console.log('Scenario data available:', !!scenarioData);
    if (scenarioData) {
      console.log('Scenario details:', {
        type: typeof scenarioData,
        keys: Object.keys(scenarioData || {}),
      });
    }
  });
});
