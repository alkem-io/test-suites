import { Page } from '@playwright/test';

// Sign In Page Object

export const navigateToLoginPageFromMenu = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  await page.getByTestId('PersonIcon').click();
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
};

export const navigateToLoginPageFromSpace = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  // ToDo
};

export const navigateToLoginPageFromForumDiscussion = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  // ToDo
};

export const navigateToLoginPageFromForumContributors = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  // ToDo
};

export const navigateToLoginPageFromForumUserProfile = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  // ToDo
};

// Sign Up Page Object

export const navigateToSignUpFromSignIn = async (
  endPoint: string,
  page: Page
) => {
  await navigateToLoginPageFromMenu(endPoint, page);
  await page.getByRole('link', { name: 'Sign up' }).click();
};

export const navigateToRegistrationFromSignUp = async (
  endPoint: string,
  page: Page
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Next' }).click();
};
