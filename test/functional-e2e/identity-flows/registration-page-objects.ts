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
  await expect(
    page.getByRole('heading', { name: 'Create an account to start' })
  ).toBeVisible();
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
  await expect(firstNameField(page)).toBeVisible();
  await expect(lastNameField(page)).toBeVisible();
  await expect(signUpButton(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect with LinkedIn' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect with Microsoft' })
  ).toBeVisible();
  await expect(page.getByText('Have an account? Sign in')).toBeVisible();
};

export const fillUpSignUpPageElements = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  page: Page
) => {
  await emailField(page).click();
  await emailField(page).fill(email);
  await passwordField(page).click();
  await passwordField(page).fill(password);
  await firstNameField(page).click();
  await firstNameField(page).fill(firstName);
  await firstNameField(page).press('Tab');
  await lastNameField(page).fill(lastName);
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
