import {
  clickElementByText,
  clickVisibleElement,
  fillVisibleInput,
  loading,
  returnElementText,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import { logo } from '../identity-flows/registration-page-object';

import { userProfilePopup } from '../user-management/user-profile-page-object';

const usernameField = 'input[name=identifier]';
const passwordField = 'input[name=password]';
const signInButton = 'button[value=password]';
const authenticatedUserName = '#main div:nth-child(1).reversed span';
const invalidCredentialsMessage = '.MuiGrid-item .MuiAlert-message';
export const signInButtonHome = '.small[href="/identity/login"] span';
export const userProfileButton = '.MuiGrid-item [alt="avatar"]';

export default class LoginPage {
  page: puppeteer.Page | undefined;
  value: string | undefined;

  static async invalidCredentials(page: puppeteer.Page) {
    return await returnElementText(page, invalidCredentialsMessage);
  }

  static async verifyAvailableAvatar(page: puppeteer.Page) {
    return await returnElementText(page, authenticatedUserName);
  }

  static async login(page: puppeteer.Page, username: string, password: string) {
    await verifyElementExistOnPage(page, logo);
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await clickVisibleElement(page, signInButton);
    await loading(page);
  }

  static async loginFail(
    page: puppeteer.Page,
    username: string,
    password: string
  ) {
    await verifyElementExistOnPage(page, logo);
    await fillVisibleInput(page, usernameField, username);
    await fillVisibleInput(page, passwordField, password);
    await clickVisibleElement(page, signInButton);
    await verifyElementExistOnPage(page, logo);
  }

  static async clicksUserProfileButton(page: puppeteer.Page) {
    await clickVisibleElement(page, userProfileButton);
    await verifyElementExistOnPage(page, userProfilePopup);
  }

  static async clicksSignOut(page: puppeteer.Page) {
    await clickElementByText(page, 'Sign out');
    await verifyElementExistOnPage(page, signInButtonHome);
  }
}
