import { Page } from '@playwright/test';

// Authentication pages selectors

// Form fields
export const emailField = (page: Page) => page.getByLabel('E-Mail *');
export const passwordField = (page: Page) => page.getByLabel('Password *');
export const firstNameField = (page: Page) => page.getByLabel('First Name *');
export const lastNameField = (page: Page) => page.getByLabel('Last Name *');
export const recoveryCodeField = (page: Page) =>
  page.getByLabel('Recovery code *');

// Buttons
export const signInButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign in', exact: true });
export const signUpButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign up', exact: true });
export const saveButton = (page: Page) =>
  page.getByRole('button', { name: 'Save' });
export const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'submit' });
export const continueButton = (page: Page) =>
  page.getByRole('button', { name: 'Continue' });
export const nextButton = (page: Page) =>
  page.getByRole('button', { name: 'Next' });

// Common checkboxes
export const termsCheckbox = (page: Page) =>
  page.locator('input[type="checkbox"]');

// Third-party authentication buttons
export const githubButton = (page: Page) =>
  page.locator('button[value="github"]');
export const microsoftButton = (page: Page) =>
  page.locator('button[value="microsoft"]');
export const linkedinButton = (page: Page) =>
  page.locator('button[value="linkedin"]');

// Common links
export const signInLink = (page: Page) =>
  page.getByRole('link', { name: /sign in/i });
export const signUpLink = (page: Page) =>
  page.getByRole('link', { name: /sign up/i });
export const privacyLink = (page: Page) =>
  page.getByRole('link', { name: /privacy/i });
export const termsLink = (page: Page) =>
  page.getByRole('link', { name: /terms/i });
export const forgotPasswordLink = (page: Page) =>
  page.getByRole('link', { name: /forgot password/i });
