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

export const navigateToLoginPageFromHeaderLink = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  await page.getByRole('link', { name: 'Sign in here', exact: true }).click();
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
  await page.getByRole('link', { name: 'Click here to sign up.' }).click();
};

export const navigateToRegistrationFromSignUp = async (
  endPoint: string,
  page: Page
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.getByLabel('I accept the Terms of Use and').check();
  await page.getByRole('button', { name: 'Sign up with E-Mail' }).click();
};
