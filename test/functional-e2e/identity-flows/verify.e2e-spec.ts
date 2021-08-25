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
const commonActions = new CommonActions();

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
    await MailPage.clickRefreshButton(pageTwo);
    emailsNumberBefore = await MailPage.getNumberOfMails(pageTwo);
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
      expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      await VerifyPage.submitVerifyPageForm(page, emailRegistered);
      expect(await commonActions.getAlertMessage(page)).toEqual(successAlert);

      // Mail client page
      await pageTwo.bringToFront();
      await MailPage.clickRefreshButton(pageTwo);
      await MailPage.openLastEmail(pageTwo);
      emailsNumberAfter = await MailPage.getNumberOfMails(pageTwo);
      await MailPage.clickRedirectLink(pageTwo);

      expect(await VerifyPage.getVerifyPageSuccessTitle(pageTwo)).toEqual(
        successMessage
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);

      // ToDo: Shouldn't the user be authenticated??
      // await verifyPage.navigateToUserProfile(pageTwo);
      // await userProfilePage.verifyUserProfileTitle(page, userFullName);
    });

    test('Verification request from Authenticated to registered user', async () => {
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityLogin}`);
      await LoginPage.login(page, emailRegistered, password);

      // Alkemio "verify" page
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      await VerifyPage.submitVerifyPageForm(page, emailRegistered);
      expect(await commonActions.getAlertMessage(page)).toEqual(successAlert);

      // Mail client page
      await pageTwo.bringToFront();
      await MailPage.clickRefreshButton(pageTwo);
      await MailPage.openLastEmail(pageTwo);
      emailsNumberAfter = await MailPage.getNumberOfMails(pageTwo);
      await MailPage.clickRedirectLink(pageTwo);

      expect(await VerifyPage.getVerifyPageSuccessTitle(pageTwo)).toEqual(
        successMessage
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
      await VerifyPage.navigateToUserProfile(pageTwo);
      await UserProfilePage.verifyUserProfileTitle(pageTwo, userFullName);
    });

    test.skip('Verification request from unauthenticated to not registered user', async () => {
      // Arrange
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('verify');

      // Act
      await VerifyPage.submitVerifyPageForm(page, notRegisteredEmail);
      expect(await commonActions.getAlertMessage(page)).toEqual(
        'An email containing a verification link has been sent to the email address you provided.'
      );

      // ToDo
      // Add assert that the not registered user received valid email
    });
  });
});
