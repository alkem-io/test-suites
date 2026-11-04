import { Page } from '@playwright/test';
import {
  acceptAllCookiesButton,
  emailField,
  firstNameField,
  lastNameField,
  logInHeaderLink,
  termsCheckbox,
} from './common-authentication-page-elements';

// Sign In Page Object

export const navigateToLoginPageFromMenu = async (
  endPoint: string,
  page: Page
) => {
  await page.goto(endPoint);
  // Accept cookies first so the consent banner does not overlay the header link.
  if (
    await acceptAllCookiesButton(page)
      .isVisible({ timeout: 3000 })
      .catch(() => false)
  ) {
    await acceptAllCookiesButton(page).click();
  }
  // CRD header exposes a direct "Log in" link (the old PersonIcon avatar menu
  // with the "Log In | Sign Up" menu item no longer exists). On a fresh visit
  // this link is present; immediately after a client-side logout the SPA header
  // can be slow to re-render it, so fall back to navigating to /login directly
  // (same destination as the link's href).
  if (
    await logInHeaderLink(page)
      .isVisible({ timeout: 5000 })
      .catch(() => false)
  ) {
    await logInHeaderLink(page).click();
  } else {
    await page.goto(`${endPoint}/login`);
  }
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
  await termsCheckbox(page).check();
};

export const navigateToRegistrationPage = async (
  endPoint: string,
  page: Page
) => {
  // Just navigate to sign up and accept terms - the form appears on the same page
  await navigateToSignUpFromSignIn(endPoint, page);
  await termsCheckbox(page).check();
};

export const navigateToRegistrationFromSignUpFillFormAndContinue = async (
  endPoint: string,
  page: Page,
  email: string,
  firstName: string,
  lastName: string
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await termsCheckbox(page).check();
  // Fill all required fields before the Next button becomes enabled
  await emailField(page).click();
  await emailField(page).fill(email);
  await firstNameField(page).click();
  await firstNameField(page).fill(firstName);
  await lastNameField(page).click();
  await lastNameField(page).fill(lastName);
  await page.getByRole('button', { name: 'Next' }).click({ timeout: 5000 });
};

export const navigateToRegistrationFromSignUpAcceptTermsAndContinue = async (
  endPoint: string,
  page: Page
) => {
  await navigateToSignUpFromSignIn(endPoint, page);
  await termsCheckbox(page).check();
  await page.getByRole('button', { name: 'Next' }).click();
};
