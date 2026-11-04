import { Page, expect } from '@playwright/test';
import {
  recoveryEmailField,
  resendVerificationButton,
} from '../authentication/common-authentication-page-elements';

// Verification Page Object (CRD "Verify your email" screen)

export const verifyVerificationPageElements = async (page: Page) => {
  await expect(
    page.getByRole('heading', { name: 'Verify your email' })
  ).toBeVisible();
  await expect(page.getByText(/check your inbox/i)).toBeVisible();
  // The verify screen labels its email field "Email *" (no hyphen).
  await expect(recoveryEmailField(page)).toBeVisible();
  await expect(resendVerificationButton(page)).toBeVisible();
};

export const verifyVerificationPageWithSendAgainButtonElements = async (
  page: Page
) => {
  await expect(
    page.getByRole('heading', { name: 'Verify your email' })
  ).toBeVisible();
  // Once a valid email is entered the resend control becomes actionable.
  await expect(resendVerificationButton(page)).toBeEnabled();
};
