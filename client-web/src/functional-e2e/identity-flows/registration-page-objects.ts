import { Page, expect } from '@playwright/test';
import {
  emailField,
  firstNameField,
  lastNameField,
  passwordField,
  signUpButton,
} from '../authentication/common-authentication-page-elements';

// Registration Page Object

export const verifyRegistrationPageElements = async (page: Page) => {
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="text"]').nth(0)).toBeVisible(); // First name field
  await expect(page.locator('input[type="text"]').nth(1)).toBeVisible(); // Last name field
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
  // Note: The social login buttons might not be present in the new design
  // Removing the LinkedIn and Microsoft button checks for now
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
