import { Page, expect } from '@playwright/test';
import {
  emailField,
  passwordField,
  signInButton,
} from '../authentication/common-authentication-page-elements';

// SignIn Page Object

export const verifySignInPageElements = async (page: Page) => {
  await expect(page.getByText('Don’t have an Alkemio account')).toBeVisible();
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();
  await expect(signInButton(page)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect with LinkedIn' })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Connect with Microsoft' })
  ).toBeVisible();
};

export const fillUpSignInPageElements = async (
  email: string,
  password: string,
  page: Page
) => {
  await emailField(page).click();
  await emailField(page).fill(email);
  await passwordField(page).click();
  await passwordField(page).fill(password);
};

export const pressSignInButtonSignInPage = async (page: Page) => {
  await signInButton(page).click();
};
