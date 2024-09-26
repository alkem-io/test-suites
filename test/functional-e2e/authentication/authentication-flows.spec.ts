import { test, expect } from '@playwright/test';
import { uniqueId } from '@test/functional-api/contributor-management/user/user.request.params';
import { delay } from '@test/utils';
import { deleteMailSlurperMails } from '@test/utils/mailslurper.rest.requests';
import { getEmails, getRecoveryCode } from '@test/utils/ui.test.helper';
import {
  navigateToLoginPageFromHeaderLink,
  navigateToLoginPageFromMenu,
  navigateToRegistrationFromSignUp,
  navigateToSignUpFromSignIn,
} from './login-page-objects';
import {
  fillUpSignUpPageElements,
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
  emailField,
  passwordField,
  recoveryCodeField,
  saveButton,
  submitButton,
} from './common-authentication-page-elements';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || '';
const baseUrl = process.env.ALKEMIO_BASE_URL_ || '';

const userEmail = `test+${uniqueId}@alkem.io`;
const newPassword = 'Test1234!!**';
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
  await navigateToLoginPageFromHeaderLink(baseUrl, page);
  await fillUpSignInPageElements('admin@alkem.io', password, page);
  await pressSignInButtonSignInPage(page);
  await verifyMyDashboardWelcomeElement(page, 'admin');
});

test('user successful registration email', async ({ page }) => {
  await navigateToRegistrationFromSignUp(baseUrl, page);
  await fillUpSignUpPageElements(userEmail, password, 'Test', 'Alkemio', page);
  await pressSignUpButtonRegistrationPage(page);

  await expect(
    page.getByRole('link', { name: '…or continue to the platform' })
  ).toBeVisible();

  const getEmailsData = await getEmails();
  const urlFromEmail = getEmailsData[0];
  if (urlFromEmail === undefined) {
    throw new Error('Url from email is missing!');
  }
  await page.goto(urlFromEmail);

  await expect(page.getByText('An email containing a')).toBeVisible();
  await page.getByLabel('Verification code *').click();
  await submitButton(page).click();

  await expect(page.getByText('You successfully verified')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible();
  await page.getByRole('link', { name: 'Continue' }).click();
  await expect(
    page.getByRole('heading', { name: 'Sign in to Alkemio' })
  ).toBeVisible();
  await fillUpSignInPageElements(userEmail, password, page);

  await pressSignInButtonSignInPage(page);
  await expect(
    page.getByRole('heading', { name: 'Welcome back Test!' })
  ).toBeVisible();

  // const getUserId = await getUserData(userEmail);
  // const registeredUserId = getUserId.data?.user.id ?? '';

  // await deleteUser(registeredUserId);
});

test('user successful password recovery', async ({ page }) => {
  await navigateToLoginPageFromHeaderLink(baseUrl, page);

  await page.getByRole('link', { name: 'Reset password' }).click();
  await emailField(page).click();
  await emailField(page).fill('non.space@alkem.io');
  await submitButton(page).click();
  await delay(2000);
  const getEmailsData = await getRecoveryCode();
  const recoveryCodeFromEmail = getEmailsData[0];
  if (recoveryCodeFromEmail === undefined) {
    throw new Error('Url from email is missing!');
  }

  await recoveryCodeField(page).click();
  await recoveryCodeField(page).fill(recoveryCodeFromEmail);
  await submitButton(page).click();
  await passwordField(page).click();
  await passwordField(page).fill(newPassword);
  await expect(
    page.getByRole('heading', { name: 'User Settings' })
  ).toBeVisible();
  await saveButton(page).click();
  await expect(
    page.getByLabel('Avatar of non space').getByRole('img')
  ).toBeVisible();
});
