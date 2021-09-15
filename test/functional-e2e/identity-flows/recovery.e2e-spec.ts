import puppeteer from 'puppeteer';
import UserProfilePage from '../user-management/user-profile-page-object';
import LoginPage, {
  userProfileButton,
} from '../authentication/login-page-object';
import {
  clickVisibleElement,
  fillVisibleInput,
  getEmails,
  returnElementText,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import RegistrationPage from '../registration/registration-page-object';
import RecoveryPage, {
  newPasswordSettingPage,
  recoveryPageErrorMessage,
  recoveryPageSubmitButton,
  recoveryPageSuccessMessage,
  recoveryPageTitle,
} from './recovery-page-object';
import {
  getUser,
  removeUserMutation,
} from '@test/functional-api/user-management/user.request.params';

let userId;
const email = `mail-${uniqueId}@alkem.io`;
const secondEmail = `secondEmail-${uniqueId}@alkem.io`;
const initPassword = 'test45612%%$';
const newPassword = 'test45612%%$-NewPassword';
const firstName = 'testFN';
const lastName = 'testLN';
let emailsNumberBefore: number;
let emailsNumberAfter: number;
const successMessageSentRecoveryMail =
  'An email containing a recovery link has been sent to the email address you provided.';
const successMessageRecoveredAccount =
  'You successfully recovered your account. Please change your password or set up an alternative login method (e.g. social sign in) within the next 15.00 minutes.';
const errorMessageEmptyField = 'Please fill required fields!';
const errorMessageSubmitRecoveryLinkTwice =
  'Could not find a strategy to recover your account with. Did you fill out the form correctly?';
const errorMessageInvalidCredentials =
  'The provided credentials are invalid, check for spelling mistakes in your password or username, email address, or phone number.';
const userFullName = firstName + ' ' + lastName;
const urlIdentityRecovery = '/identity/recovery';
const urlIdentityLogin = '/identity/login';

describe('Recovery smoke tests', () => {
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

  describe('Recovery identity flows', () => {
    describe('Negative scenarios', () => {
      beforeAll(async () => {
        page = await browser.newPage();
        await page.goto(
          process.env.ALKEMIO_BASE_URL + '/identity/registration',
          {
            waitUntil: ['networkidle0', 'domcontentloaded'],
          }
        );
        await RegistrationPage.register(
          page,
          email,
          initPassword,
          firstName,
          lastName
        );
      });
      beforeEach(async () => {
        let getEmailsData = await getEmails();
        emailsNumberBefore = getEmailsData[2];
      });
      afterAll(async () => {
        const requestUserData = await getUser(email);
        userId = requestUserData.body.data.user.id;
        await removeUserMutation(userId);
      });
      test('Authenticated user navigating to recovery page, redirects to home page', async () => {
        await page.goto(
          process.env.ALKEMIO_BASE_URL + `${urlIdentityRecovery}`,
          {
            waitUntil: ['networkidle0', 'domcontentloaded'],
          }
        );
        let newUrl = await page.url();
        await verifyElementExistOnPage(page, userProfileButton);
        expect(newUrl).toEqual(process.env.ALKEMIO_BASE_URL + '/');
      });

      test('Error message is thrown, when saving without setting password', async () => {
        await LoginPage.clicksUserProfileButton(page);
        await LoginPage.clicksSignOut(page);
        await page.goto(
          process.env.ALKEMIO_BASE_URL + `${urlIdentityRecovery}`,
          {
            waitUntil: ['networkidle0', 'domcontentloaded'],
          }
        );

        await RecoveryPage.setRecoveryEmail(page, email);
        await RecoveryPage.submitRecoveryPageForm(page);

        // Get Url from Email
        let getEmailsData = await getEmails();
        let urlFromEmail = getEmailsData[0];
        if (urlFromEmail === undefined) {
          throw new Error(`Url from email is missing!`);
        }

        // Navigate to the Url
        await page.goto(urlFromEmail, {
          waitUntil: ['networkidle0', 'domcontentloaded'],
        });

        // Change password
        await RecoveryPage.savePasswordButtonSettingsPageForm(page);
        expect(
          await returnElementText(page, recoveryPageSuccessMessage)
        ).toEqual(errorMessageEmptyField);
      });

      test('Submitting password reset twice, throws an error', async () => {
        await LoginPage.clicksUserProfileButton(page);
        await LoginPage.clicksSignOut(page);
        await page.goto(
          process.env.ALKEMIO_BASE_URL + `${urlIdentityRecovery}`,
          {
            waitUntil: ['networkidle0', 'domcontentloaded'],
          }
        );

        await RecoveryPage.setRecoveryEmail(page, email);
        await clickVisibleElement(page, recoveryPageSubmitButton);
        await clickVisibleElement(page, recoveryPageSubmitButton);

        // Get Url from Email
        let getEmailsData = await getEmails();
        let urlFromEmail = getEmailsData[0];
        if (urlFromEmail === undefined) {
          throw new Error(`Url from email is missing!`);
        }
        emailsNumberAfter = getEmailsData[2];
        expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
        expect(await returnElementText(page, recoveryPageErrorMessage)).toEqual(
          errorMessageSubmitRecoveryLinkTwice
        );
      });
    });
    describe('Positive scenarios', () => {
      beforeAll(async () => {
        page = await browser.newPage();
        await page.goto(
          process.env.ALKEMIO_BASE_URL + '/identity/registration'
        );
        await RegistrationPage.register(
          page,
          secondEmail,
          initPassword,
          firstName,
          lastName
        );
      });
      beforeEach(async () => {
        let getEmailsData = await getEmails();
        emailsNumberBefore = getEmailsData[2];
      });
      afterAll(async () => {
        const requestUserData = await getUser(secondEmail);
        userId = requestUserData.body.data.user.id;
        await removeUserMutation(userId);
      });
      test('Unauthenticated user navigating to recovers password successfully', async () => {
        await LoginPage.clicksUserProfileButton(page);
        await LoginPage.clicksSignOut(page);
        await page.goto(
          process.env.ALKEMIO_BASE_URL + `${urlIdentityRecovery}`,
          {
            waitUntil: ['networkidle2', 'domcontentloaded'],
          }
        );
        let newUrl = await page.url();
        expect(newUrl).toContain(process.env.ALKEMIO_BASE_URL + '/');
        expect(await returnElementText(page, recoveryPageTitle)).toEqual(
          'Password Reset'
        );
        await RecoveryPage.setRecoveryEmail(page, secondEmail);
        await RecoveryPage.submitRecoveryPageForm(page);
        expect(
          await returnElementText(page, recoveryPageSuccessMessage)
        ).toEqual(successMessageSentRecoveryMail);

        // Get Url from Email
        let getEmailsData = await getEmails();
        let urlFromEmail = getEmailsData[0];
        if (urlFromEmail === undefined) {
          throw new Error(`Url from email is missing!`);
        }
        emailsNumberAfter = getEmailsData[2];
        expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
        // Navigate to the Url
        await page.goto(urlFromEmail, {
          waitUntil: ['networkidle0', 'domcontentloaded'],
        });

        // Change password
        expect(
          await returnElementText(page, recoveryPageSuccessMessage)
        ).toEqual(successMessageRecoveredAccount);

        await fillVisibleInput(page, newPasswordSettingPage, newPassword);
        await RecoveryPage.savePasswordButtonSettingsPageForm(page);
        await UserProfilePage.verifyUserProfileTitle(page, userFullName);
        let userProfileUrl = await page.url();
        expect(userProfileUrl).toContain(
          process.env.ALKEMIO_BASE_URL + '/profile'
        );
        await LoginPage.clicksUserProfileButton(page);
        await LoginPage.clicksSignOut(page);
      });

      test('Signin failed using old password', async () => {
        await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityLogin}`, {
          waitUntil: ['networkidle2', 'domcontentloaded'],
        });
        await LoginPage.loginFail(page, secondEmail, initPassword);
        expect(await LoginPage.invalidCredentials(page)).toContain(
          errorMessageInvalidCredentials
        );
      });

      test('Signin successfully using new password', async () => {
        await page.goto(process.env.ALKEMIO_BASE_URL + `${urlIdentityLogin}`, {
          waitUntil: ['networkidle0', 'domcontentloaded'],
        });
        await LoginPage.login(page, secondEmail, newPassword);
        expect(await LoginPage.verifyAvailableAvatar(page)).toContain(
          userFullName
        );
      });
    });
  });
});
