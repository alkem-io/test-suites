import puppeteer from 'puppeteer';
import MailPage from './mail-page-object';
import VerifyPage from './verify-page-object';
import CommonActions from '../common/actions';
import UserProfilePage from '../user-management/user-profile-page-object';
import LoginPage from '../authentication/login-page-object';

let emailsNumberBefore: number;
let emailsNumberAfter: number;
const successAlert =
  'An email containing a verification link has been sent to the email address you provided.';
const successMessage = 'Thank you for verifying your email address!';
const userFullName = 'admin alkemio';
const emailRegistered = `admin@alkem.io`;
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const notRegisteredEmail = 'alkemio@test.com';
const mailUrl = 'http://localhost:4436';
const urlIdentityVerify = '/identity/verify';
const urlIdentityLogin = '/identity/login';
const mail = new MailPage();
const verifyPage = new VerifyPage();
const commonActions = new CommonActions();
const userProfilePage = new UserProfilePage();
const loginPage = new LoginPage();

describe('Registration smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  let pageTwo: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });
  });
  beforeEach(async () => {
    pageTwo = await browser.newPage();
    await pageTwo.goto(mailUrl);
    await mail.clickRefreshButton(pageTwo);
    emailsNumberBefore = await mail.getNumberOfMails(pageTwo);
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
  });

  describe.skip('Verify identity flows', () => {
    test('Verification request from UNauthenticated to registered user', async () => {
      // Alkemio "verify" page
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await verifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      await verifyPage.submitVerifyPageForm(page, emailRegistered);
      expect(await commonActions.getAlertMessage(page)).toEqual(successAlert);

      // Mail client page
      await pageTwo.bringToFront();
      await mail.clickRefreshButton(pageTwo);
      await mail.openLastEmail(pageTwo);
      emailsNumberAfter = await mail.getNumberOfMails(pageTwo);
      await mail.clickRedirectLink(pageTwo);

      expect(await verifyPage.getVerifyPageSuccessTitle(pageTwo)).toEqual(
        successMessage
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);

      // Shouldn't the user be authenticated??
      // await verifyPage.navigateToUserProfile(pageTwo);
      // await userProfilePage.verifyUserProfileTitle(page, userFullName);
    });

    test('Verification request from Authenticated to registered user', async () => {
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityLogin}`);
      await loginPage.login(page, emailRegistered, password);

      // Alkemio "verify" page
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await verifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      await verifyPage.submitVerifyPageForm(page, emailRegistered);
      expect(await commonActions.getAlertMessage(page)).toEqual(successAlert);

      // Mail client page
      await pageTwo.bringToFront();
      await mail.clickRefreshButton(pageTwo);
      await mail.openLastEmail(pageTwo);
      emailsNumberAfter = await mail.getNumberOfMails(pageTwo);
      await mail.clickRedirectLink(pageTwo);

      expect(await verifyPage.getVerifyPageSuccessTitle(pageTwo)).toEqual(
        successMessage
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
      await verifyPage.navigateToUserProfile(pageTwo);
      await userProfilePage.verifyUserProfileTitle(pageTwo, userFullName);
    });

    test.skip('Verification request from unauthenticated to not registered user', async () => {
      // Arrange
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await verifyPage.getVerifyPageTitle(page)).toEqual('verify');

      // Act
      await verifyPage.submitVerifyPageForm(page, notRegisteredEmail);
      expect(await commonActions.getAlertMessage(page)).toEqual(
        'An email containing a verification link has been sent to the email address you provided.'
      );

      // ToDo
      // Add assert that the not registered user received valid email
    });
  });
});
