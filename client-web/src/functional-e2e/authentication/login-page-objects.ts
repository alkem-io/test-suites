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

export const navigateToVerificationPage = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint + '/verify');
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

export const navigateToRegistrationFromAcceptTerms = async (
  endPoint: string,
  page: Page
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.locator('input[type="checkbox"]').check();
};

export const navigateToRegistrationPage = async (
  endPoint: string,
  page: Page
) => {
  // Just navigate to sign up and accept terms - the form appears on the same page
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.locator('input[type="checkbox"]').check();
};

export const navigateToRegistrationFromSignUpFillFormAndContinue = async (
  endPoint: string,
  page: Page,
  email: string,
  firstName: string,
  lastName: string
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.locator('input[type="checkbox"]').check();
  // Fill all required fields before the Next button becomes enabled
  await page.locator('input[type="email"]').click();
  await page.locator('input[type="email"]').fill(email);
  await page.getByLabel('First Name').click();
  await page.getByLabel('First Name').fill(firstName);
  await page.getByLabel('Last Name').click();
  await page.getByLabel('Last Name').fill(lastName);
  await page.getByRole('button', { name: 'Next' }).click({ timeout: 5000 });
};

export const navigateToRegistrationFromSignUpAcceptTermsAndContinue = async (
  endPoint: string,
  page: Page
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Next' }).click();
};
