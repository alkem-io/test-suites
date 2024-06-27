import {
  clickVisibleElement,
  fillVisibleInput,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const usernameField = "input[name='traits.email']";
const passwordField = 'input[name=password]';
const firstNameField = "input[name='traits.name.first']";
const lastNameField = "input[name='traits.name.last']";
const acceptTermsInput = "input[name='traits.accepted_terms']";
const signInButton = 'button[value=password]';
export const warningRequiredFieldSignUp =
  '.MuiAlert-standardWarning .MuiAlert-message';
export const logo =
  '.MuiContainer-root.MuiContainer-maxWidthXl a img[src="/logo.png"]';

export default class RegistrationPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async setUsername(page: puppeteer.Page, username: string) {
    await verifyElementExistOnPage(page, logo);
    await fillVisibleInput(page, usernameField, username);
    await clickVisibleElement(page, signInButton);
  }

  static async register(
    page: puppeteer.Page,
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    await verifyElementExistOnPage(page, logo);
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await fillVisibleInput(page, firstNameField, firstName);
    await fillVisibleInput(page, lastNameField, lastName);
    await clickVisibleElement(page, acceptTermsInput);
    await clickVisibleElement(page, signInButton);
  }
}
