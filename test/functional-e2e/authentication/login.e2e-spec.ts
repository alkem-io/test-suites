import {
  clearBrowserCookies,
  goToUrlWait,
  returnElementText,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import { errorMessageInvalidCredentials } from '../common/messages-list';
import { urlIdentityLogin } from '../common/url-list';
import LoginPage, {
  signInButtonHome,
  userProfileButton,
} from './login-page-object';

const email = 'admin@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

describe('Authentication smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      slowMo: 10,
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });
    page = await browser.newPage();
  });

  beforeEach(async () => {
    await clearBrowserCookies(page);
    await goToUrlWait(page, urlIdentityLogin);
  });

  afterEach(async () => {
    await clearBrowserCookies(page);
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Authentication', () => {
    test('User sign out successfully', async () => {
      await LoginPage.login(page, email, password);
      await verifyElementExistOnPage(page, userProfileButton);
      await LoginPage.clicksUserProfileButton(page);
      await LoginPage.clicksSignOut(page);
      expect(await returnElementText(page, signInButtonHome)).toEqual(
        'Sign in'
      );
    });
    test('User fails to authenticate with invalid password', async () => {
      await LoginPage.loginFail(page, email, 'invalidPassword');
      const errorMessage = await LoginPage.invalidCredentials(page);
      expect(errorMessage).toEqual(errorMessageInvalidCredentials);
    });

    test('User authenticates successfully', async () => {
      await LoginPage.login(page, email, password);
      expect(await LoginPage.verifyAvailableAvatar(page)).toContain('admin');
    });
  });
});
