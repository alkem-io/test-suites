import {
  clickVisibleElement,
  fillVisibleInput,
  waitElementToBeVisibile,
  returnElementText,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import { laodingIndicator } from '../common/selectors';

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
    return await returnElementText(page, invalidCredentialsMessage);
  }

  static async verifyAvailableAvatar(page: puppeteer.Page) {
    return await returnElementText(page, authenticatedUserAvatar);
  }

  static async login(page: puppeteer.Page, username: string, password: string) {
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await clickVisibleElement(page, signInButton);
    await waitElementToBeVisibile(page, laodingIndicator);
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
    await waitElementToBeVisibile(page, laodingIndicator);
  }

  static async clicksUserProfileButton(page: puppeteer.Page) {
    await clickVisibleElement(page, userProfileButton);
  }

  static async clicksSignOut(page: puppeteer.Page) {
    await clickVisibleElement(page, signOutButton);
    await waitElementToBeVisibile(page, laodingIndicator);
  }

  static async signInButtonHomeIsDisplayed(page: puppeteer.Page) {
    return await returnElementText(page, signInButtonHome);
  }
}
