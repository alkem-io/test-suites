import { test, expect } from '@playwright/test';
import {
  navigateToLoginPageFromMenu,
  navigateToRegistrationFromAcceptTerms,
  navigateToSignUpFromSignIn,
  navigateToVerificationPage,
} from './login-page-objects';
import { verifyRegistrationPageElements } from '../identity-flows/registration-page-objects';
import { verifySignUpPageElements } from '../identity-flows/signup-page-objects';
import { verifySignInPageElements } from '../identity-flows/signin-page-objects';
import {
  verifyVerificationPageElements,
  verifyVerificationPageWithSendAgainButtonElements,
} from '../identity-flows/verify-page-objects';
import {
  continueButton,
  emailField,
} from './common-authentication-page-elements';
import { UniqueIDGenerator } from '@alkemio/tests-lib';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** @testCase TC-1600 */
test.describe('Authentication - Page Element Verification', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('verify registration page elements', async ({ page }) => {
    await navigateToRegistrationFromAcceptTerms(baseUrl, page);
    await verifyRegistrationPageElements(page);
  });

  test('verify sign-up page elements', async ({ page }) => {
    await navigateToSignUpFromSignIn(baseUrl, page);
    await verifySignUpPageElements(page);
  });

  test('verify login page elements', async ({ page }) => {
    await navigateToLoginPageFromMenu(baseUrl, page);
    await verifySignInPageElements(page);
  });

  test('verify verification page elements', async ({ page }) => {
    await navigateToVerificationPage(baseUrl, page);
    await verifyVerificationPageElements(page);
  });

  test('verify verification page with resend code elements', async ({
    page,
  }) => {
    const uniqueId = UniqueIDGenerator.getID();
    const userEmail = `test+${uniqueId}@alkem.io`;

    await navigateToVerificationPage(baseUrl, page);
    await verifyVerificationPageElements(page);

    await emailField(page).click();
    await emailField(page).fill(userEmail);
    await continueButton(page).click();

    await verifyVerificationPageWithSendAgainButtonElements(page);
  });
});
