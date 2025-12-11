import { Page, expect } from '@playwright/test';
import {
  nextButton,
  privacyLink,
  signInLink,
  termsCheckbox,
  termsLink,
} from '../authentication/common-authentication-page-elements';

// SignUp Page Object

export const verifySignUpPageElements = async (page: Page) => {
  // Heading
  await expect(page.getByRole('heading', { name: 'Sign up' })).toBeVisible();

  // Terms checkbox (should be unchecked by default)
  await expect(termsCheckbox(page)).toBeVisible();
  await expect(termsCheckbox(page)).not.toBeChecked();

  // Next button (should be disabled until terms are accepted)
  await expect(nextButton(page)).toBeVisible();
  await expect(nextButton(page)).toBeDisabled();

  // Check if page contains terms-related text and links
  await expect(page.locator('body')).toContainText('Terms');

  // Privacy policy and terms links (if available)
  if ((await privacyLink(page).count()) > 0) {
    // we have more than one link with this name on the page
    await expect(privacyLink(page).first()).toBeVisible();
  }
  if ((await termsLink(page).count()) > 0) {
    await expect(termsLink(page).first()).toBeVisible();
  }

  // Link to sign in (if user already has account)
  if ((await signInLink(page).count()) > 0) {
    await expect(signInLink(page)).toBeVisible();
  }
};
