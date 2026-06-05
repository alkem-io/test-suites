import { Page, expect } from '@playwright/test';
import {
  dismissNewLookDialog,
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

  // Third-party authentication options (CRD "Continue with <Provider>" buttons).
  // Microsoft and LinkedIn are present across environments; GitHub is
  // environment-dependent (configured locally but not on the test env), so it is
  // asserted only when advertised.
  await expect(microsoftButton(page)).toBeVisible();
  await expect(linkedinButton(page)).toBeVisible();
  if ((await githubButton(page).count()) > 0) {
    await expect(githubButton(page)).toBeVisible();
  }

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
  // Wait until we leave the login screen (destination may be home or, for the
  // restricted-page sign-in flow, the originally requested page), then dismiss
  // the one-time "A fresh new Alkemio is here" dialog that overlays the
  // authenticated shell and would otherwise block subsequent assertions/clicks.
  await page
    .waitForURL(url => !/\/login/.test(url.toString()), { timeout: 12000 })
    .catch(() => {});
  await dismissNewLookDialog(page);
};
