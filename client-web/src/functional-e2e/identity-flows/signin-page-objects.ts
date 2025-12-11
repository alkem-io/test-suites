import { Page, expect } from '@playwright/test';
import {
  emailField,
  forgotPasswordLink,
  githubButton,
  linkedinButton,
  microsoftButton,
  passwordField,
  signInButton,
  signUpLink,
} from '../authentication/common-authentication-page-elements';

// SignIn Page Object

export const verifySignInPageElements = async (page: Page) => {
  // Heading
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

  // Form fields
  await expect(emailField(page)).toBeVisible();
  await expect(passwordField(page)).toBeVisible();

  // Sign in button
  await expect(signInButton(page)).toBeVisible();

  // Third-party authentication options
  await expect(githubButton(page)).toBeVisible();
  await expect(microsoftButton(page)).toBeVisible();
  await expect(linkedinButton(page)).toBeVisible();

  // Password recovery link
  await expect(forgotPasswordLink(page)).toBeVisible();

  // Sign up link (for new users)
  if ((await signUpLink(page).count()) > 0) {
    await expect(signUpLink(page)).toBeVisible();
  }
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
