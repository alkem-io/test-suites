import { fillVisibleInput } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const usernameField = "input[name='traits.email']";
const passwordField = 'input[name=password]';
const firstNameField = "input[name='traits.name.first']";
const lastNameField = "input[name='traits.name.last']";
const acceptTermsInput = "input[name='traits.accepted_terms']";
const signInButton = 'button[value=password]';
export const warningRequiredFieldSignUp =
  '.MuiAlert-standardWarning .MuiAlert-message';

export default class RegistrationPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async setUsername(page: puppeteer.Page, username: string) {
    await fillVisibleInput(page, usernameField, username);
    await page.click(signInButton);
  }

  static async register(
    page: puppeteer.Page,
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await fillVisibleInput(page, firstNameField, firstName);
    await fillVisibleInput(page, lastNameField, lastName);
    await page.click(acceptTermsInput);
    await page.click(signInButton);
  }
}
