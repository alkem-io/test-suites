import { delay } from '@alkemio/tests-lib';
import { Page, expect } from '@playwright/test';

// SignUp Page Object

export const verifyMyDashboardWelcomeElement = async (page: Page) => {
  // Verify Tips & Tricks span is visible (only available on homepage for authenticated users)
  await expect(
    page.locator('span').filter({ hasText: /tips.*tricks/i })
  ).toBeVisible({
    timeout: 30000,
  }); // 30 seconds timeout for page load
};
