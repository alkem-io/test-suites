import { clickVisibleElement } from '@test/utils/ui.test.helper';
import puppeteer from 'puppeteer';
import LoginPage, { userProfileButton } from './login-page-object';

const email = 'admin@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';

describe('Authentication smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      //headless: false, slowMo: 30
    });
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/login');
    });

    test('User authenticates successfully', async () => {
      await LoginPage.login(page, email, password);
      expect(await LoginPage.verifyAvailableAvatar(page)).toContain('admin');
    });

    test('User sign out successfully', async () => {
      await LoginPage.login(page, email, password);
      await LoginPage.clicksUserProfileButton(page);
      await LoginPage.clicksSignOut(page);

      expect(await LoginPage.signInButtonHomeIsDisplayed(page)).toEqual(
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
  });
});
