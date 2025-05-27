import { Page } from '@playwright/test';

// Authentication pages selectors

export const emailField = (page: Page) => page.getByLabel('E-Mail *');
export const passwordField = (page: Page) => page.getByLabel('Password *');

export const firstNameField = (page: Page) => page.getByLabel('First Name *');
export const lastNameField = (page: Page) => page.getByLabel('Last Name *');
export const recoveryCodeField = (page: Page) =>
  page.getByLabel('Recovery code *');

export const signInButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign in with password', exact: true });
export const signUpButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign up', exact: true });
export const saveButton = (page: Page) =>
  page.getByRole('button', { name: 'Save' });
export const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'submit' });
export const continueButton = (page: Page) =>
  page.getByRole('button', { name: 'Continue' });
