import { Page, expect } from '@playwright/test';
import { signInButton } from '../authentication/common-authentication-page-elements';

// SignUp Page Object

export const verifySignUpPageElements = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Create an account to start' })
  ).toBeVisible();
  await expect(page.getByText('To keep the platform safe,')).toBeVisible();
  await expect(page.locator('label')).toBeVisible();
  await expect(
    page.locator('div').filter({ hasText: /^Connect with LinkedIn$/ })
  ).toBeVisible();
  await expect(
    page.locator('div').filter({ hasText: /^Connect with Microsoft$/ })
  ).toBeVisible();
  await expect(
    page.locator('div').filter({ hasText: /^Sign up with E-Mail$/ })
  ).toBeVisible();
  await expect(page.getByText('Already have an account?')).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
};
