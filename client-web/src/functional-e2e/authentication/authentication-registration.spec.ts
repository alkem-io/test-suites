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
import { expectSignedIn } from '../my-dashboard/my-dashboard-page-objects';
import {
  nextButton,
} from './common-authentication-page-elements';
import { getVerificationLinkFor, UniqueIDGenerator } from '@alkemio/tests-lib';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

test.describe('Authentication - Registration Flows', () => {
  // Run serially: these flows share the MailSlurper inbox (each beforeEach
  // clears it and each test polls it for a verification email), so they are not
  // parallel-safe within the file.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
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

    // The verification mail for THIS address — read scoped to the recipient,
    // so other flows' mail in the shared inbox is neither matched nor removed.
    await expect
      .poll(() => getVerificationLinkFor(userEmail), {
        message: `verification link for ${userEmail} in the inbox`,
        timeout: 30_000,
      })
      .toBeTruthy();
    const verificationLink = (await getVerificationLinkFor(userEmail))!;

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
    await expectSignedIn(page);

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

    // The verification mail for THIS address — read scoped to the recipient,
    // so other flows' mail in the shared inbox is neither matched nor removed.
    await expect
      .poll(() => getVerificationLinkFor(userEmail), {
        message: `verification link for ${userEmail} in the inbox`,
        timeout: 30_000,
      })
      .toBeTruthy();
    const verificationLink = (await getVerificationLinkFor(userEmail))!;

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
    await expectSignedIn(page);

    // TODO: Cleanup - delete test user after verification
  });
});
