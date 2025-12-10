import { delay } from '@alkemio/tests-lib';
import { Page, expect } from '@playwright/test';

// SignUp Page Object

export const verifyMyDashboardWelcomeElement = async (
  page: Page,
  firstName: string
) => {
  await expect(
    page
      .locator('h1')
      .filter({ hasText: `Welcome, ${firstName}` })
      .first()
  ).toBeVisible({ timeout: 30000 }); // 30 seconds timeout for page load
};
