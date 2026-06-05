import { test, expect } from '@playwright/test';
import {
  navigateToRegistrationFromAcceptTerms,
  navigateToRegistrationFromSignUpFillFormAndContinue,
} from './login-page-objects';
import {
  fillUpSignUpPageElements,
  fillUpSignUpPasswordElements,
} from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { verifyMyDashboardWelcomeElement } from '../my-dashboard/my-dashboard-page-objects';
import {
  nextButton,
} from './common-authentication-page-elements';
import {
  delay,
  deleteMailSlurperMails,
  getVerificationLink,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Authentication - Registration Flows', () => {
  // Run serially: these flows share the MailSlurper inbox (each beforeEach
  // clears it and each test polls it for a verification email), so they are not
  // parallel-safe within the file.
  test.describe.configure({ mode: 'serial' });

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

    // Verify we reached the verification step (CRD "Verify your email" screen)
    await expect(
      page.getByRole('heading', { name: 'Verify your email' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'The last step is to verify your email address. Please check your inbox for an email with instructions.'
      )
    ).toBeVisible();

    // Wait for verification email to arrive
    await delay(3000);

    // Link verification flow: poll for verification link
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

  // Previously skipped for client-web bug #8317; re-enabled against the CRD
  // registration flow (accept terms + fill form on the same step, then password).
  test('user registration with accept terms first then fill form', async ({
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

    // Set password and advance (CRD password step uses the "Next" button)
    await fillUpSignUpPasswordElements(password, page);
    await nextButton(page).click();

    // Verify we reached the CRD "Verify your email" step
    await expect(
      page.getByRole('heading', { name: 'Verify your email' })
    ).toBeVisible();

    // Wait for verification email to arrive
    await delay(3000);

    // Link verification flow: poll for verification link
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
