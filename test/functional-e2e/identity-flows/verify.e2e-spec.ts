import puppeteer from 'puppeteer';
import VerifyPage from './verify-page-object';
import CommonActions from '../common/actions';
import UserProfilePage from '../user-management/user-profile-page-object';
import LoginPage from '../authentication/login-page-object';
import { getEmails } from '@test/utils/ui.test.helper';

let emailsNumberBefore: number;
let emailsNumberAfter: number;
const successAlert =
  'An email containing a verification link has been sent to the email address you provided.';
const successMessage = 'Thank you for verifying your email address!';
const userFullName = 'admin alkemio';
const emailRegistered = `admin@alkem.io`;
const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const notRegisteredEmail = 'alkemio@test.com';
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
    let getEmailsData = await getEmails();
    emailsNumberBefore = getEmailsData[1];
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Verify identity flows', () => {
    test('Verification request from UNauthenticated to registered user', async () => {
      // Alkemio "verify" page
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      await VerifyPage.submitVerifyPageForm(page, emailRegistered);
      expect(await commonActions.getAlertMessage(page)).toEqual(successAlert);

      // Get Url from Email
      let getEmailsData = await getEmails();
      let urlFromEmail = getEmailsData[0];
      emailsNumberAfter = getEmailsData[1];

      // Navigate to the Url
      await page.goto(urlFromEmail, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
      });

      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
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

      // Get Url from Email
      let getEmailsData = await getEmails();
      let urlFromEmail = getEmailsData[0];
      emailsNumberAfter = getEmailsData[1];

      // Navigate to the Url
      await page.goto(urlFromEmail, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
      });

      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
        successMessage
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
      await VerifyPage.navigateToUserProfile(page);
      await UserProfilePage.verifyUserProfileTitle(page, userFullName);
    });

    test('Verification request from unauthenticated to not registered user', async () => {
      // Arrange
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityVerify}`);
      expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

      // Act
      await VerifyPage.submitVerifyPageForm(page, notRegisteredEmail);
      expect(await commonActions.getAlertMessage(page)).toEqual(
        'An email containing a verification link has been sent to the email address you provided.'
      );

      // Get Url from Email
      let getEmailsData = await getEmails();
      emailsNumberAfter = getEmailsData[1];

      // Assert
      expect(getEmailsData[0]).toContain(
        'someone asked to verify this email address, but we were unable to find an account for this address'
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
    });
  });
});
