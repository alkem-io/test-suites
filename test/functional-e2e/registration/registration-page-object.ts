import puppeteer from 'puppeteer';

const usernameField = "input[name='traits.email']";
const passwordField = 'input[name=password]';
const firstNameField = "input[name='traits.name.first']";
const lastNameField = "input[name='traits.name.last']";
const acceptTermsInput = "input[name='traits.accepted_terms']";
const signInButton = 'button[value=password]';
const authenticatedUserAvatar =
  '#main .container-fluid div:nth-child(1).reversed span';
const warningRiquiredFieldSignUp = '.MuiAlert-standardWarning .MuiAlert-message';

export default class RegistrationPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async setUsername(page: puppeteer.Page, username: string) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.click(signInButton);
  }

  async register(
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

  async verifyWarningRequiredSignInField(page: puppeteer.Page) {
    await page.waitForSelector(warningRiquiredFieldSignUp);
    let element = await page.$(warningRiquiredFieldSignUp);
    return (this.value = await page.evaluate(
      (el: { textContent: string }) => el.textContent,
      element
    ));
  }

  async verifyAuthenticatedUserAvatar(page: puppeteer.Page) {
    await page.waitForSelector(authenticatedUserAvatar);
    let element = await page.$(authenticatedUserAvatar);
    return (this.value = await page.evaluate(
      (el: { textContent: string }) => el.textContent,
      element
    ));
  }
}
