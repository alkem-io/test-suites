import {
  clickVisibleElement,
  fillVisibleInput,
  verifyUserIsOnPageByGetTextElement,
  waitForLoadingIndicatorToHide,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';

const usernameField = 'input[name=password_identifier]';
const passwordField = 'input[name=password]';
const signInButton = 'button[value=password]';
const signInButtonHome = '.small[href="/identity/login"] span';
const authenticatedUserAvatar = '#main div:nth-child(1).reversed span';
const invalidCredentialsMessage = '.MuiGrid-item .MuiAlert-message  ';
export const userProfileButton = '.MuiGrid-item [alt="avatar"]';
const signOutButton = '.MuiPopover-paper .MuiBox-root:nth-child(3) button';

export default class LoginPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async invalidCredentials(page: puppeteer.Page) {
    return await verifyUserIsOnPageByGetTextElement(
      page,
      invalidCredentialsMessage
    );
  }

  static async verifyAvailableAvatar(page: puppeteer.Page) {
    return await verifyUserIsOnPageByGetTextElement(
      page,
      authenticatedUserAvatar
    );
  }

  static async login(page: puppeteer.Page, username: string, password: string) {
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await clickVisibleElement(page, signInButton);
    await waitForLoadingIndicatorToHide(page, true);
    await page.waitForSelector(authenticatedUserAvatar, {
      hidden: false,
      visible: true,
    });
  }

  static async loginFail(
    page: puppeteer.Page,
    username: string,
    password: string
  ) {
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await clickVisibleElement(page, signInButton);
    await waitForLoadingIndicatorToHide(page, true);
  }

  static async clicksUserProfileButton(page: puppeteer.Page) {
    await clickVisibleElement(page, userProfileButton);
  }

  static async clicksSignOut(page: puppeteer.Page) {
    await clickVisibleElement(page, signOutButton);
    await waitForLoadingIndicatorToHide(page, true);
  }

  static async signInButtonHomeIsDisplayed(page: puppeteer.Page) {
    return await verifyUserIsOnPageByGetTextElement(page, signInButtonHome);
  }
}
