import { Page, expect } from '@playwright/test';
import {
  emailField,
  firstNameField,
  githubButton,
  lastNameField,
  linkedinButton,
  microsoftButton,
  nextButton,
  passwordField,
  signInLink,
  signUpButton,
} from '../authentication/common-authentication-page-elements';

// Registration Page Object

export const verifyRegistrationPageElements = async (page: Page) => {
  // Heading
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();

  // Form fields
  await expect(emailField(page)).toBeVisible();
  await expect(firstNameField(page)).toBeVisible();
  await expect(lastNameField(page)).toBeVisible();

  // Next button should be visible but initially disabled (until all fields filled)
  await expect(nextButton(page)).toBeVisible();
  await expect(nextButton(page)).toBeDisabled();

  // Third-party sign-in options (if available)
  if ((await githubButton(page).count()) > 0) {
    await expect(githubButton(page)).toBeVisible();
  }
  if ((await microsoftButton(page).count()) > 0) {
    await expect(microsoftButton(page)).toBeVisible();
  }
  if ((await linkedinButton(page).count()) > 0) {
    await expect(linkedinButton(page)).toBeVisible();
  }

  // Link to sign in (if user already has account)
  if ((await signInLink(page).count()) > 0) {
    await expect(signInLink(page)).toBeVisible();
  }
};

export const fillUpSignUpPageElements = async (
  email: string,
  firstName: string,
  lastName: string,
  page: Page
) => {
  await emailField(page).click();
  await emailField(page).fill(email);
  await firstNameField(page).click();
  await firstNameField(page).fill(firstName);
  await firstNameField(page).press('Tab');
  await lastNameField(page).fill(lastName);
};

export const fillUpSignUpPasswordElements = async (
  password: string,
  page: Page
) => {
  await passwordField(page).click();
  await passwordField(page).fill(password);
};

export const pressSignUpButtonRegistrationPage = async (page: Page) => {
  await signUpButton(page).click();
};

// Registration Success Page Object
export const verifyRegistrationSuccessPageElements = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Nearly there…' })
  ).toBeVisible();
  await expect(page.getByText('The last step is to verify')).toBeVisible();
  await expect(
    page.getByRole('link', { name: '…or continue to the platform' })
  ).toBeVisible();
  await page
    .getByRole('link', { name: '…or continue to the platform' })
    .click();
  await expect(
    page.getByRole('link', { name: 'Sign in here', exact: true })
  ).toBeVisible();
};
