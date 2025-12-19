import { test, expect } from '@playwright/test';
import {
  navigateToRegistrationFromAcceptTerms,
  navigateToRegistrationFromSignUpFillFormAndContinue,
} from './login-page-objects';
import {
  fillUpSignUpPageElements,
  fillUpSignUpPasswordElements,
  pressSignUpButtonRegistrationPage,
} from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  continueButton,
  nextButton,
} from './common-authentication-page-elements';
import {
  delay,
  deleteMailSlurperMails,
  getEmails,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Authentication - Registration Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await deleteMailSlurperMails();
  });

  // Note: This test creates real users and requires email verification
  // Consider cleanup after test or use dedicated test accounts
  test('user successful registration with email verification', async ({
    page,
  }) => {
    test.setTimeout(60000); // Extended timeout for email-dependent flow

    const uniqueId = UniqueIDGenerator.getID();
    const userEmail = `test+${uniqueId}@alkem.io`;

    // Navigate to registration and accept terms
    await navigateToRegistrationFromAcceptTerms(baseUrl, page);

    // Fill in registration form
    await fillUpSignUpPageElements(userEmail, 'Test', 'Alkemio', page);
    await nextButton(page).click();

    // Set password
    await fillUpSignUpPasswordElements(password, page);
    await nextButton(page).click();

    // Verify we reached the verification step
    await expect(page.getByText('Sign up')).toBeVisible();
    await expect(
      page.getByText(
        'The last step is to verify your email address. Please check your inbox for an email with instructions.'
      )
    ).toBeVisible();

    // Wait for email and get verification URL
    await delay(1000);
    const getEmailsData = await getEmails();
    const urlFromEmail = getEmailsData[0];
    if (urlFromEmail === undefined) {
      throw new Error('Verification URL from email is missing!');
    }

    // Navigate to verification URL from email
    await page.goto(urlFromEmail);

    // Complete verification
    await expect(page.getByText('An email containing a')).toBeVisible();
    await page.getByLabel('Verification code *').click();
    await continueButton(page).click();

    // Verify success message
    await expect(page.getByText('You successfully verified')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible();

    // Continue to sign in
    await page.getByRole('link', { name: 'Continue' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await verifyMyDashboardWelcomeElement(page, 'Test');

    // TODO: Cleanup - delete test user after verification
    // const getUserId = await getUserData(userEmail);
    // const registeredUserId = getUserId.data?.user.id ?? '';
    // await deleteUser(registeredUserId);
  });

  // Skipped until bug is fixed: https://app.zenhub.com/workspaces/alkemio-development-5ecb98b262ebd9f4aec4194c/issues/gh/alkem-io/client-web/8317
  test.skip('user registration with accept terms first then fill form', async ({
    page,
  }) => {
    test.setTimeout(60000);

    const uniqueId = UniqueIDGenerator.getID();
    const userEmail = `test+${uniqueId}@alkem.io`;

    // Navigate and fill form with pre-accepted terms
    await navigateToRegistrationFromSignUpFillFormAndContinue(
      baseUrl,
      page,
      userEmail,
      'Test',
      'Alkemio'
    );

    // Set password
    await fillUpSignUpPasswordElements(password, page);
    await pressSignUpButtonRegistrationPage(page);

    // Verify registration pending email verification
    await expect(
      page.getByRole('link', { name: '…or continue to the platform' })
    ).toBeVisible();

    // Wait for email and get verification URL
    await delay(1000);
    const getEmailsData = await getEmails();
    const urlFromEmail = getEmailsData[0];
    if (urlFromEmail === undefined) {
      throw new Error('Verification URL from email is missing!');
    }

    // Navigate to verification URL from email
    await page.goto(urlFromEmail);

    // Complete verification
    await expect(page.getByText('An email containing a')).toBeVisible();
    await page.getByLabel('Verification code *').click();
    await continueButton(page).click();

    // Verify success and continue to sign in
    await expect(page.getByText('You successfully verified')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible();
    await page.getByRole('link', { name: 'Continue' }).click();

    await expect(
      page.getByRole('heading', { name: 'Sign in to Alkemio' })
    ).toBeVisible();

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await verifyMyDashboardWelcomeElement(page, 'Test');

    // TODO: Cleanup - delete test user after verification
  });
});
