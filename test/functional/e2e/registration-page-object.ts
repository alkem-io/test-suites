import puppeteer from 'puppeteer';

const usernameField = "input[name='traits.email']";
const passwordField = 'input[name=password]';
const firstNameField = "input[name='traits.name.first']";
const lastNameField = "input[name='traits.name.last']";
const acceptTermsInput = "input[name='traits.accepted_terms']";
const signInButton = 'button[value=password]';
const authenticatedUserAvatar =
  '#main .container-fluid div:nth-child(1).reversed span';
const warningRiquiredFieldSignUp = '.alert-warning';

export default class RegistrationPage {
  page: any;
  value: any;

  async setUsername(page: any, username?: any) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.click(signInButton);
  }

  async verifyWirningRequiredSignInField(page: puppeteer.Page) {
    await page.waitForSelector(warningRiquiredFieldSignUp);
    let element = await page.$(warningRiquiredFieldSignUp);
    return (this.value = await page.evaluate(
      (el: { textContent: any }) => el.textContent,
      element
    ));
  }

  async register(
    page: any,
    username?: any,
    password?: any,
    firstName?: string,
    lastName?: string,
    acceptTerms?: boolean
  ) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.type(passwordField, password);
    await page.type(firstNameField, firstName);
    await page.type(lastNameField, lastName);
    await page.click(acceptTermsInput, acceptTerms);
    await page.click(signInButton);
    await page.waitForSelector(authenticatedUserAvatar);
    let element = await page.$(authenticatedUserAvatar);
    this.value = await page.evaluate(
      (el: { textContent: any }) => el.textContent,
      element
    );
  }

  async verifyAuthenticatedUserAvatar(page: puppeteer.Page) {
    await page.waitForSelector(authenticatedUserAvatar);
    let element = await page.$(authenticatedUserAvatar);
    return (this.value = await page.evaluate(
      (el: { textContent: any }) => el.textContent,
      element
    ));
  }
}
