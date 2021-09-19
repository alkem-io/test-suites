import {
  clearBrowserCookies,
  loading,
  returnElementText,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
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
    await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/login', {
      waitUntil: ['domcontentloaded', 'networkidle0'],
    });
    await loading(page);
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
      let errorMessage = await LoginPage.invalidCredentials(page);
      expect(errorMessage).toEqual(
        'The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number.'
      );
    });

    test('User authenticates successfully', async () => {
      await LoginPage.login(page, email, password);
      expect(await LoginPage.verifyAvailableAvatar(page)).toContain('admin');
    });
  });
});
