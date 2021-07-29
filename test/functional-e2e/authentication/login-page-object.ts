import puppeteer from 'puppeteer';

const usernameField = 'input[name=password_identifier]';
const passwordField = 'input[name=password]';
const signInButton = 'button[value=password]';
const signInButtonHome = '.col a[href="/identity/login"] span';
const authenticatedUserAvatar =
  '#main .container-fluid div:nth-child(1).reversed span';
const invalidCredentialsMessage = '.alert-danger';
const userProfileButton = '.col span';
const signOutButton = '.popover .MuiBox-root:nth-child(3) button';

export default class LoginPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  async invalidCredentials(page: puppeteer.Page) {
    await page.waitForSelector(invalidCredentialsMessage);
    let element = await page.$(invalidCredentialsMessage);
    return (this.value = await page.evaluate(
      (el: { textContent: string }) => el.textContent,
      element
    ));
  }

  async verifyAvailableAvatar(page: puppeteer.Page) {
    await page.waitForSelector(authenticatedUserAvatar);
    let element = await page.$(authenticatedUserAvatar);
    return (this.value = await page.evaluate(
      (el: { textContent: string }) => el.textContent,
      element
    ));
  }

  async login(page: puppeteer.Page, username: string, password: string) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.type(passwordField, password);
    await page.click(signInButton);
    await page.waitForSelector(authenticatedUserAvatar);
  }

  async loginFail(page: puppeteer.Page, username: string, password: string) {
    await page.waitForSelector(usernameField);
    await page.type(usernameField, username);
    await page.type(passwordField, password);
    await page.click(signInButton);
  }

  async clicksUserProfileButton(page: puppeteer.Page) {
    await page.waitForSelector(userProfileButton);
    await page.click(userProfileButton);
  }

  async clicksSignOut(page: puppeteer.Page) {
    await page.waitForSelector(signOutButton);
    await page.click(signOutButton);
  }

  async signInButtonHomeIsDisplayed(page: puppeteer.Page) {
    await page.waitForSelector(signInButtonHome);
    let element = await page.$(signInButtonHome);
    return (this.value = await page.evaluate(
      (el: { textContent: string }) => el.textContent,
      element
    ));
  }
}
