import puppeteer from 'puppeteer';
import LoginPage from './login-page-object';

const email = 'admin@alkem.io';
const password = process.env.AUTH_TEST_HARNESS_PASSWORD;
const loginPage = new LoginPage();

describe('Authentication smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      //slowMo: 10,
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
      await page.goto(process.env.ALKEMIO_BASE_URL + '/auth/login');
    });

    test('User authenticates successfully', async () => {
      await loginPage.login(page, email, password);
      expect(await loginPage.verifyAvailableAvatar(page)).toContain('admin');
    });

    test('User sign out successfully', async () => {
      await loginPage.login(page, email, password);
      await loginPage.clicksUserProfileButton(page);
      await loginPage.clicksSignOut(page);

      expect(await loginPage.signInButtonHomeIsDisplayed(page)).toEqual(
        'Sign in'
      );
    });

    test('User fails to authenticate with invalid password', async () => {
      await loginPage.login(page, email, 'invalidPassword');
      let errorMessage = await loginPage.invalidCredentials(page);
      expect(errorMessage).toEqual(
        'The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number.'
      );
    });
  });
});
