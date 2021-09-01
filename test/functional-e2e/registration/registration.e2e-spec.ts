import puppeteer from 'puppeteer';
import RegistrationPage, {
  warningRiquiredFieldSignUp,
} from './registration-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';
import { getEmails, returnElementText } from '@test/utils/ui.test.helper';
import VerifyPage from '../identity-flows/verify-page-object';

let userId;
const email = `mail-${uniqueId}@alkem.io`;
const password = 'test45612%%$';
const firstName = 'testFN';
const lastName = 'testLN';
let emailsNumberBefore: number;
let emailsNumberAfter: number;
const successMessageSignUp = 'Thank you for signing up!';
const successMessageVerify = 'Thank you for verifying your email address!';

describe('Registration smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });
  });

  afterEach(async () => {
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Registration flow', () => {
    beforeEach(async () => {
      let getEmailsData = await getEmails();
      emailsNumberBefore = getEmailsData[1];
      page = await browser.newPage();
      await page.goto(process.env.ALKEMIO_BASE_URL + '/identity/registration');
    });

    test('User registers successfully', async () => {
      await RegistrationPage.register(
        page,
        email,
        password,
        firstName,
        lastName
      );
      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
        successMessageSignUp
      );

      // Get Url from Email
      let getEmailsData = await getEmails();
      let urlFromEmail = getEmailsData[0];
      emailsNumberAfter = getEmailsData[1];

      // Navigate to the Url
      await page.goto(urlFromEmail, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
      });

      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
        successMessageVerify
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);

      const requestUserData = await getUser(email);
      userId = requestUserData.body.data.user.id;
      await removeUserMutation(userId);
    });

    test('User cannot register with invalid data successfully', async () => {
      await RegistrationPage.setUsername(page, email);
      expect(await returnElementText(page, warningRiquiredFieldSignUp)).toEqual(
        'Please fill required fields!'
      );

      // Get Url from Email
      let getEmailsData = await getEmails();
      emailsNumberAfter = getEmailsData[1];

      expect(emailsNumberBefore).toEqual(emailsNumberAfter);
    });
  });
});
