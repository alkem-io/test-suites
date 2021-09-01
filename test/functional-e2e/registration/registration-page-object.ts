import { verifyUserIsOnPageByGetTextElement } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const usernameField = "input[name='traits.email']";
const passwordField = 'input[name=password]';
const firstNameField = "input[name='traits.name.first']";
const lastNameField = "input[name='traits.name.last']";
const acceptTermsInput = "input[name='traits.accepted_terms']";
const signInButton = 'button[value=password]';
const warningRiquiredFieldSignUp =
  '.MuiAlert-standardWarning .MuiAlert-message';

export default class RegistrationPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async setUsername(page: puppeteer.Page, username: string) {
    await page.waitForSelector(usernameField, { hidden: false, visible: true });
    await page.type(usernameField, username);
    await page.click(signInButton);
  }

  static async register(
    page: puppeteer.Page,
    username: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.type(passwordField, password);
    await page.type(firstNameField, firstName);
    await page.type(lastNameField, lastName);
    await page.click(acceptTermsInput);
    await page.click(signInButton);
  }

  static async verifyWarningRequiredSignInField(page: puppeteer.Page) {
    return await verifyUserIsOnPageByGetTextElement(
      page,
      warningRiquiredFieldSignUp
    );
  }
}
