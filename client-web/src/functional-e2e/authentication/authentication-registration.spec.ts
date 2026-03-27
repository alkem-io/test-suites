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
  getVerificationLink,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const isLocalEnv = baseUrl.includes('localhost');

test.describe('Authentication - Registration Flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await deleteMailSlurperMails();
  });

  /**
   * Note: This test creates real users with unique emails (test+{uniqueId}@alkem.io)
   * and requires email verification.
   *
   * User cleanup is not implemented because:
   * 1. Each test run creates a unique user that won't conflict with subsequent runs
   * 2. The deleteUser API function needs to be added to @alkemio/tests-lib
   *
   * Consider implementing cleanup in test.afterEach once deleteUser is available.
   */
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

    // Wait for verification email to arrive
    await delay(3000);

    if (isLocalEnv) {
      // Code verification flow (local): navigate to URL from email, enter code
      const getEmailsData = await getEmails();
      const urlFromEmail = getEmailsData[0];
      if (urlFromEmail === undefined) {
        throw new Error('Verification URL from email is missing!');
      }

      await page.goto(urlFromEmail);
      await expect(page.getByText('An email containing a')).toBeVisible();
      await page.getByLabel('Verification code *').click();
      await continueButton(page).click();

      await expect(page.getByText('You successfully verified')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Continue' })
      ).toBeVisible();
      await page.getByRole('link', { name: 'Continue' }).click();
    } else {
      // Link verification flow (remote): poll for verification link
      let verificationLink: string | undefined;
      for (let attempt = 0; attempt < 10; attempt++) {
        verificationLink = await getVerificationLink();
        if (verificationLink) break;
        await delay(2000);
      }
      if (verificationLink === undefined) {
        throw new Error('Verification link from email is missing!');
      }

      await page.goto(verificationLink);
      await expect(page.getByText('You successfully verified')).toBeVisible({
        timeout: 10000,
      });
      const continueLink = page.getByRole('link', { name: 'Continue' });
      if (await continueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueLink.click();
      }
    }

    await expect(
      page.getByRole('heading', { name: 'Sign in' })
    ).toBeVisible({ timeout: 10000 });

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await verifyMyDashboardWelcomeElement(page);

    // Note: User cleanup not implemented - each test creates unique user (test+{uniqueId}@alkem.io)
    // that won't conflict with subsequent runs. To implement cleanup, add deleteUser
    // function to @alkemio/tests-lib and use it in test.afterEach hook.
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

    // Wait for verification email to arrive
    await delay(3000);

    if (isLocalEnv) {
      // Code verification flow (local): navigate to URL from email, enter code
      const getEmailsData = await getEmails();
      const urlFromEmail = getEmailsData[0];
      if (urlFromEmail === undefined) {
        throw new Error('Verification URL from email is missing!');
      }

      await page.goto(urlFromEmail);
      await expect(page.getByText('An email containing a')).toBeVisible();
      await page.getByLabel('Verification code *').click();
      await continueButton(page).click();

      await expect(page.getByText('You successfully verified')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Continue' })
      ).toBeVisible();
      await page.getByRole('link', { name: 'Continue' }).click();
    } else {
      // Link verification flow (remote): poll for verification link
      let verificationLink: string | undefined;
      for (let attempt = 0; attempt < 10; attempt++) {
        verificationLink = await getVerificationLink();
        if (verificationLink) break;
        await delay(2000);
      }
      if (verificationLink === undefined) {
        throw new Error('Verification link from email is missing!');
      }

      await page.goto(verificationLink);
      await expect(page.getByText('You successfully verified')).toBeVisible({
        timeout: 10000,
      });
      const continueLink = page.getByRole('link', { name: 'Continue' });
      if (await continueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueLink.click();
      }
    }

    await expect(
      page.getByRole('heading', { name: 'Sign in' })
    ).toBeVisible({ timeout: 10000 });

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await verifyMyDashboardWelcomeElement(page);

    // TODO: Cleanup - delete test user after verification
  });
});
