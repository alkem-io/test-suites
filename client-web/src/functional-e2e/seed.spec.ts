import { test, expect } from '@playwright/test';
import { navigateToLoginPageFromMenu } from './authentication/login-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from './identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from './my-dashboard/my-dashboard-page-objects';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change-me!';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Test group', () => {
  test('seed', async ({ page }) => {
    await navigateToLoginPageFromMenu(baseUrl, page);
    await fillUpSignInPageElements('admin@alkem.io', password, page);
    await pressSignInButtonSignInPage(page);
    await verifyMyDashboardWelcomeElement(page);
  });
});
