import puppeteer from 'puppeteer';
import RegistrationPage, {
  warningRequiredFieldSignUp,
} from './registration-page-object';
import { uniqueId } from '@test/utils/mutations/create-mutation';
import {
  deleteUserCodegen,
  getUserDataCodegen,
} from '@test/functional-api/user-management/user.request.params';
import {
  clearBrowserCookies,
  clickVisibleElement,
  fillVisibleInput,
  getEmails,
  goToUrlWait,
  returnElementText,
  verifyElementExistOnPage,
} from '@test/utils/ui.test.helper';
import VerifyPage from '../identity-flows/verify-page-object';
import CommonActions from '../common/actions';
import LoginPage, {
  userProfileButton,
} from '../authentication/login-page-object';
import RecoveryPage, {
  recoveryPageSuccessMessage,
  recoveryPageSubmitButton,
  recoveryPageErrorMessage,
  recoveryPageTitle,
  newPasswordSettingPage,
} from './recovery-page-object';
import {
  urlIdentityRecovery,
  urlIdentityLogin,
  urlIdentityRegistration,
  urlIdentityVerify,
  baseUrl,
} from '../common/url-list';
import {
  errorMessageEmptyField,
  errorMessageInvalidCredentials,
  successMessageRecoveredAccount,
  successMessageSentRecoveryMail,
  successMessageSignUp,
  successMessageVerifyEmail,
} from '../common/messages-list';
import UserProfilePage from '../user-management/user-profile-page-object';

describe('Identity smoke tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  let userId;
  const email = `mail-${uniqueId}@alkem.io`;
  const initPassword = 'test45612%%$';
  const newPassword = 'test45612%%$-NewPassword';
  const firstName = 'testFN';
  const lastName = 'testLN';
  const userFullName = firstName + ' ' + lastName;
  let emailsNumberBefore: number;
  let emailsNumberAfter: number;

  const registerTestAccount = async () => {
    page = await browser.newPage();
    await goToUrlWait(page, urlIdentityRegistration);
    await RegistrationPage.register(
      page,
      email,
      initPassword,
      firstName,
      lastName
    );
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({
      slowMo: 20,
      defaultViewport: null,
      args: ['--window-size=1920,1080'],
    });
  });

  afterAll(async () => {
    await clearBrowserCookies(page);
    await browser.close();
    const requestUserData = await getUserDataCodegen(email);
    userId = requestUserData?.data?.user?.id ?? '';
    await deleteUserCodegen(userId);
  });

  afterEach(async () => {
    await clearBrowserCookies(page);
  });

  describe('Registration flow', () => {
    beforeEach(async () => {
      const getEmailsData = await getEmails();
      emailsNumberBefore = getEmailsData[2];
      page = await browser.newPage();
      await goToUrlWait(page, urlIdentityRegistration);
    });

    test('User registers successfully', async () => {
      const regEmail = `regMail-${uniqueId}@alkem.io`;

      await RegistrationPage.register(
        page,
        regEmail,
        initPassword,
        firstName,
        lastName
      );
      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
        successMessageSignUp
      );

      // Get Url from Email
      const getEmailsData = await getEmails();
      const urlFromEmail = getEmailsData[0];
      if (urlFromEmail === undefined) {
        throw new Error('Url from email is missing!');
      }
      emailsNumberAfter = getEmailsData[2];

      // Navigate to the Url
      await goToUrlWait(page, urlFromEmail);

      expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
        successMessageVerifyEmail
      );
      expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);

      const requestUserData = await getUserDataCodegen(regEmail);
      const regUiserId = requestUserData?.data?.user.id ?? '';
      await deleteUserCodegen(regUiserId);
    });

    test('User cannot register with invalid data successfully', async () => {
      await RegistrationPage.setUsername(page, email);
      expect(await returnElementText(page, warningRequiredFieldSignUp)).toEqual(
        'Please fill required fields!'
      );

      // Get Url from Email
      const getEmailsData = await getEmails();
      emailsNumberAfter = getEmailsData[2];

      expect(emailsNumberBefore).toEqual(emailsNumberAfter);
    });
  });

  describe.skip('Verify and Recovery scenarios', () => {
    beforeAll(async () => {
      await registerTestAccount();
    });
    beforeEach(async () => {
      await clearBrowserCookies(page);
      const getEmailsData = await getEmails();
      emailsNumberBefore = getEmailsData[2];
    });
    describe('Verification smoke tests', () => {
      const successAlert =
        'An email containing a verification link has been sent to the email address you provided.';

      const notRegisteredEmail = 'alkemio@test.com';
      const commonActions = new CommonActions();

      describe('Verify identity flows', () => {
        test('Verification request from UNauthenticated to registered user', async () => {
          // Alkemio "verify" page
          page = await browser.newPage();
          await goToUrlWait(page, urlIdentityVerify);
          expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

          await VerifyPage.submitVerifyPageForm(page, email);
          expect(await commonActions.getAlertMessage(page)).toEqual(
            successAlert
          );

          // Get Url from Email
          const getEmailsData = await getEmails();
          const urlFromEmail = getEmailsData[0];
          if (urlFromEmail === undefined) {
            throw new Error('Url from email is missing!');
          }
          emailsNumberAfter = getEmailsData[2];

          // Navigate to the Url
          await goToUrlWait(page, urlFromEmail);

          expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
            successMessageVerifyEmail
          );
          expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);

          // ToDo: Shouldn't the user be authenticated??
          // await verifyPage.navigateToUserProfile(pageTwo);
          // await userProfilePage.verifyUserProfileTitle(page, userFullName);
        });

        test('Verification request from Authenticated to registered user', async () => {
          page = await browser.newPage();
          await goToUrlWait(page, urlIdentityLogin);

          await LoginPage.login(page, email, initPassword);

          // Alkemio "verify" page
          await goToUrlWait(page, urlIdentityVerify);
          expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

          await VerifyPage.submitVerifyPageForm(page, email);
          expect(await commonActions.getAlertMessage(page)).toEqual(
            successAlert
          );

          // Get Url from Email
          const getEmailsData = await getEmails();
          const urlFromEmail = getEmailsData[0];
          if (urlFromEmail === undefined) {
            throw new Error('Url from email is missing!');
          }
          emailsNumberAfter = getEmailsData[2];

          // Navigate to the Url
          await goToUrlWait(page, urlFromEmail);

          expect(await VerifyPage.getVerifyPageSuccessTitle(page)).toEqual(
            successMessageVerifyEmail
          );
          expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
          //ToDo - enable after issue with new link to profile is fixed

          await VerifyPage.navigateToUserProfile(page);
          await UserProfilePage.verifyUserProfileTitle(page, userFullName);
        });

        test('Verification request from unauthenticated to not registered user', async () => {
          // Arrange
          page = await browser.newPage();
          await goToUrlWait(page, urlIdentityVerify);
          expect(await VerifyPage.getVerifyPageTitle(page)).toEqual('Verify');

          // Act
          await VerifyPage.submitVerifyPageForm(page, notRegisteredEmail);
          expect(await commonActions.getAlertMessage(page)).toEqual(
            'An email containing a verification link has been sent to the email address you provided.'
          );

          // Get Url from Email
          const getEmailsData = await getEmails();
          emailsNumberAfter = getEmailsData[2];

          // Assert
          expect(getEmailsData[1]).toContain(
            'someone asked to verify this email address, but we were unable to find an account for this address'
          );
          expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
        });
      });
    });
    describe.skip('Recovery identity flows', () => {
      const errorMessageSubmitRecoveryLinkTwice =
        'Could not find a strategy to recover your account with. Did you fill out the form correctly?';

      describe('Negative scenarios', () => {
        beforeEach(async () => {
          await clearBrowserCookies(page);
          const getEmailsData = await getEmails();
          emailsNumberBefore = getEmailsData[2];
        });

        test('Authenticated user navigating to recovery page, redirects to home page', async () => {
          await goToUrlWait(page, urlIdentityLogin);
          await LoginPage.login(page, email, initPassword);
          await verifyElementExistOnPage(page, userProfileButton);
          await goToUrlWait(page, urlIdentityRecovery);
          await verifyElementExistOnPage(page, userProfileButton);
          const newUrl = await page.url();
          expect(newUrl).toEqual(baseUrl + '/');
        });

        test('Error message is thrown, when saving without setting password', async () => {
          await goToUrlWait(page, urlIdentityRecovery);
          await RecoveryPage.setRecoveryEmail(page, email);
          await RecoveryPage.submitRecoveryPageForm(page);

          // Get Url from Email
          const getEmailsData = await getEmails();
          const urlFromEmail = getEmailsData[0];
          if (urlFromEmail === undefined) {
            throw new Error('Url from email is missing!');
          }

          // Navigate to the Url
          await goToUrlWait(page, urlFromEmail);

          // Change password
          await RecoveryPage.savePasswordButtonSettingsPageForm(page);
          expect(
            await returnElementText(page, recoveryPageSuccessMessage)
          ).toEqual(errorMessageEmptyField);
        });

        // ToDo - enable, when the bug is fixed
        // Bug: https://app.zenspace.com/workspaces/alkemio-5ecb98b262ebd9f4aec4194c/issues/alkem-io/client-web/1238
        test.skip('Submitting "password reset" button, twice, throws an error', async () => {
          await goToUrlWait(page, urlIdentityRecovery);
          await RecoveryPage.setRecoveryEmail(page, email);
          await clickVisibleElement(page, recoveryPageSubmitButton);
          await clickVisibleElement(page, recoveryPageSubmitButton);

          // Get Url from Email
          const getEmailsData = await getEmails();
          const urlFromEmail = getEmailsData[0];
          if (urlFromEmail === undefined) {
            throw new Error('Url from email is missing!');
          }
          emailsNumberAfter = getEmailsData[2];
          expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
          expect(
            await returnElementText(page, recoveryPageErrorMessage)
          ).toEqual(errorMessageSubmitRecoveryLinkTwice);
        });
      });
      describe('Positive scenarios', () => {
        beforeEach(async () => {
          const getEmailsData = await getEmails();
          emailsNumberBefore = getEmailsData[2];
        });

        test('Unauthenticated user navigats to "recovery password" page successfully', async () => {
          await goToUrlWait(page, urlIdentityRecovery);
          const newUrl = await page.url();
          expect(newUrl).toContain(baseUrl + '/');
          expect(await returnElementText(page, recoveryPageTitle)).toEqual(
            'Password Reset'
          );
          await RecoveryPage.setRecoveryEmail(page, email);
          await RecoveryPage.submitRecoveryPageForm(page);
          expect(
            await returnElementText(page, recoveryPageSuccessMessage)
          ).toEqual(successMessageSentRecoveryMail);

          // Get Url from Email
          const getEmailsData = await getEmails();
          const urlFromEmail = getEmailsData[0];
          if (urlFromEmail === undefined) {
            throw new Error('Url from email is missing!');
          }
          emailsNumberAfter = getEmailsData[2];
          expect(emailsNumberBefore).toEqual(emailsNumberAfter - 1);
          // Navigate to the Url
          await goToUrlWait(page, urlFromEmail);

          // Change password
          expect(
            await returnElementText(page, recoveryPageSuccessMessage)
          ).toEqual(successMessageRecoveredAccount);

          await fillVisibleInput(page, newPasswordSettingPage, newPassword);
          await RecoveryPage.savePasswordButtonSettingsPageForm(page);

          const requestUserData = await getUserDataCodegen(email);
          userId = requestUserData?.data?.user.id;
          const nameID = requestUserData?.data?.user.nameID;

          await UserProfilePage.verifyUserProfileTitle(page, userFullName);
          const userProfileUrl = await page.url();
          expect(userProfileUrl).toContain(
            process.env.ALKEMIO_BASE_URL + `/user/${nameID}`
          );
        });

        test('Signin fails, using old password', async () => {
          await goToUrlWait(page, urlIdentityLogin);
          await LoginPage.loginFail(page, email, initPassword);
          expect(await LoginPage.invalidCredentials(page)).toContain(
            errorMessageInvalidCredentials
          );
        });

        test('Signin successful, using new password', async () => {
          await goToUrlWait(page, urlIdentityLogin);
          await LoginPage.login(page, email, newPassword);
          expect(await LoginPage.verifyAvailableAvatar(page)).toContain(
            userFullName
          );
        });
      });
    });
  });
});
