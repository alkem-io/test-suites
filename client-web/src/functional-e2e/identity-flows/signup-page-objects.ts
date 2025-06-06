import { Page, expect } from '@playwright/test';
import { signInButton } from '../authentication/common-authentication-page-elements';

// SignUp Page Object

export const verifySignUpPageElements = async (page: Page) => {
  // The signup page in the new design has different elements
  await expect(page.locator('input[type="checkbox"]')).toBeVisible(); // Terms checkbox
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible(); // Next button
  // Check if page contains terms-related text
  await expect(page.locator('body')).toContainText('Terms');
};
