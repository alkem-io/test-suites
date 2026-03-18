import { test } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './authentication/login-page-objects';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change-me!';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe.skip('Test group', () => {
  test('seed', async ({ page }) => {
    await navigateToLoginPageFromMenu(baseUrl, page);
  });
});
