import { Page, expect } from '@playwright/test';

// SignUp Page Object

export const verifyMyDashboardWelcomeElement = async (
  page: Page,
  firstName: string
) => {
  await expect(
    page
      .locator('div')
      .filter({ hasText: `Welcome back ${firstName}` })
      .first()
  ).toBeVisible();
};
