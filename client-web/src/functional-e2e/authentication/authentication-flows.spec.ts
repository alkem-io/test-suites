import { test, expect } from '@playwright/test';
//import { getEmails, getRecoveryCode } from 'src/utils/ui.test.helper';
import {
  navigateToLoginPageFromMenu,
  navigateToRegistrationFromSignUp,
  navigateToSignUpFromSignIn,
} from './login-page-objects';
import {
  fillUpSignUpPageElements,
  fillUpSignUpPasswordElements,
  pressSignUpButtonRegistrationPage,
  verifyRegistrationPageElements,
} from '../identity-flows/registration-page-objects';
import { verifySignUpPageElements } from '../identity-flows/signup-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
  verifySignInPageElements,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  continueButton,
  emailField,
  passwordField,
  recoveryCodeField,
  saveButton,
  submitButton,
} from './common-authentication-page-elements';
//import { deleteMailSlurperMails } from 'src/utils/mailslurper.rest.requests';
//import { deleteUser, getUserData } from '../../duplicate/user.request.params';
import {
  delay,
  deleteMailSlurperMails,
  getEmails,
  getRecoveryCode,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
//import {  } from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const baseUrl = process.env.ALKEMIO_BASE_URL || '';
const uniqueId = UniqueIDGenerator.getID();

const userEmail = `test+${uniqueId}@alkem.io`;
const newPassword = password;

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await deleteMailSlurperMails();
});
test.describe.configure({ mode: 'serial' });

test('verify registration page', async ({ page }) => {
  await navigateToRegistrationFromSignUp(baseUrl, page);
  await verifyRegistrationPageElements(page);
});

test('verify sign-up page', async ({ page }) => {
  await navigateToSignUpFromSignIn(baseUrl, page);
  await verifySignUpPageElements(page);
});

test('verify login page', async ({ page }) => {
  await navigateToLoginPageFromMenu(baseUrl, page);
  await verifySignInPageElements(page);
});

test('verify verification page', async ({ page }) => {
  await navigateToLoginPageFromMenu(baseUrl, page);
  await verifySignInPageElements(page);
});

test('user successful authentication', async ({ page }) => {
  await navigateToLoginPageFromMenu(baseUrl, page);
  await fillUpSignInPageElements('admin@alkem.io', password, page);
  await pressSignInButtonSignInPage(page);
  await verifyMyDashboardWelcomeElement(page, 'admin');
});

test('user successful registration email', async ({ page }) => {
  await navigateToRegistrationFromSignUp(baseUrl, page);
  await fillUpSignUpPageElements(userEmail, 'Test', 'Alkemio', page);
  await pressSignUpButtonRegistrationPage(page);
  await fillUpSignUpPasswordElements(password, page);
  await pressSignUpButtonRegistrationPage(page);

  await expect(
    page.getByRole('link', { name: '…or continue to the platform' })
  ).toBeVisible();

  await delay(1000);
  const getEmailsData = await getEmails();
  const urlFromEmail = getEmailsData[0];
  if (urlFromEmail === undefined) {
    throw new Error('Url from email is missing!');
  }
  await page.goto(urlFromEmail);

  await expect(page.getByText('An email containing a')).toBeVisible();
  await page.getByLabel('Verification code *').click();
  await continueButton(page).click();

  await expect(page.getByText('You successfully verified')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in to Alkemio' })
  ).toBeVisible();
  await fillUpSignInPageElements(userEmail, password, page);

  await pressSignInButtonSignInPage(page);
  await expect(
    page.getByRole('heading', { name: 'Welcome back, Test!' })
  ).toBeVisible();

  // const getUserId = await getUserData(userEmail);
  // const registeredUserId = getUserId.data?.user.id ?? '';

  // await deleteUser(registeredUserId);
});

test('user successful password recovery', async ({ page }) => {
  await navigateToLoginPageFromMenu(baseUrl, page);

  await page.getByRole('link', { name: 'Reset password' }).click();
  await emailField(page).click();
  await emailField(page).fill('non.space@alkem.io');
  await continueButton(page).click();
  await delay(1300);
  const getEmailsData = await getRecoveryCode();
  const recoveryCodeFromEmail = getEmailsData[0];
  if (recoveryCodeFromEmail === undefined) {
    throw new Error('Url from email is missing!');
  }

  await recoveryCodeField(page).click();
  await recoveryCodeField(page).fill(recoveryCodeFromEmail);
  await continueButton(page).click();
  await passwordField(page).click();
  await passwordField(page).fill(newPassword);
  await expect(
    page.getByRole('heading', { name: 'User Settings' })
  ).toBeVisible();
  await saveButton(page).click();
  await expect(
    page
      .locator('div')
      .filter({ hasText: /^Welcome back, non!Ready to make some impact\?$/ })
      .nth(2)
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invitations' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Tips & Tricks' })
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Account' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Create my own Space' })
  ).toBeVisible();

  // ToDo
  // after password reset, delete the user or revert the password to intial state
});
