import { Page } from '@playwright/test';

// Authentication pages selectors

// Form fields
// NOTE: The CRD auth screens keep the MUI-style required-field label suffix
// (" *"), so these getByLabel selectors remain valid after the migration.
export const emailField = (page: Page) => page.getByLabel('E-Mail *');
// The recovery screen labels its field "Email *" (no hyphen) — distinct from
// the sign-in/sign-up "E-Mail *".
export const recoveryEmailField = (page: Page) => page.getByLabel('Email *');
export const passwordField = (page: Page) => page.getByLabel('Password *');
export const firstNameField = (page: Page) => page.getByLabel('First Name *');
export const lastNameField = (page: Page) => page.getByLabel('Last Name *');
export const recoveryCodeField = (page: Page) =>
  page.getByLabel('Recovery code *');

// Buttons
export const signInButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign in', exact: true });
export const signUpButton = (page: Page) =>
  page.getByRole('button', { name: 'Sign up', exact: true });
export const saveButton = (page: Page) =>
  page.getByRole('button', { name: 'Save' });
export const submitButton = (page: Page) =>
  page.getByRole('button', { name: 'submit' });
export const continueButton = (page: Page) =>
  page.getByRole('button', { name: 'Continue' });
export const nextButton = (page: Page) =>
  page.getByRole('button', { name: 'Next' });
// CRD email-verification screen resend control.
export const resendVerificationButton = (page: Page) =>
  page.getByRole('button', { name: /resend verification email/i });

// Common checkboxes
// CRD sign-up terms checkbox has an accessible name beginning "I accept …".
export const termsCheckbox = (page: Page) =>
  page.getByRole('checkbox', { name: /i accept/i });

// Third-party authentication buttons
// CRD renders these as "Continue with <Provider>" role=button (not the old
// MUI Kratos button[value="…"] form controls).
export const githubButton = (page: Page) =>
  page.getByRole('button', { name: /continue with github/i });
export const microsoftButton = (page: Page) =>
  page.getByRole('button', { name: /continue with microsoft/i });
export const linkedinButton = (page: Page) =>
  page.getByRole('button', { name: /continue with linkedin/i });

// Common links
export const signInLink = (page: Page) =>
  page.getByRole('link', { name: /sign in/i });
export const signUpLink = (page: Page) =>
  page.getByRole('link', { name: /sign up/i });
export const privacyLink = (page: Page) =>
  page.getByRole('link', { name: /privacy/i });
export const termsLink = (page: Page) =>
  page.getByRole('link', { name: /terms/i });
export const forgotPasswordLink = (page: Page) =>
  page.getByRole('link', { name: /forgot password/i });

// Restricted-access pages. Two distinct CRD screens exist:
// - Unauthenticated visitor → "Access Restricted" with a "Sign in / Sign up" link.
// - Authenticated-but-unauthorized user → "Access Restricted" with a
//   "Go to Home" button (new CRD design; route /restricted).
export const signInSignUpLink = (page: Page) =>
  page.getByRole('link', { name: 'Sign in / Sign up', exact: true });
export const goToHomeButton = (page: Page) =>
  page.getByRole('button', { name: 'Go to Home', exact: true });

// Menu items
// New CRD authenticated shell labels the logout action "Log out" (the old MUI
// shell used "Sign out").
export const logoutMenuItem = (page: Page) =>
  page.getByRole('menuitem', { name: 'Log out', exact: true });

// User menu — the avatar/user button is the last control in the CRD header
// banner (it carries the user's display name + "Beta" badge rather than a
// stable alt text, so target it positionally within the banner).
export const userMenuAvatar = (page: Page) =>
  page.getByRole('banner').getByRole('button').last();

// Page headings
export const signInHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Sign in', exact: true });
export const accessRestrictedHeading = (page: Page) =>
  page.getByRole('heading', { name: 'Access Restricted', exact: true });
export const welcomeHeading = (page: Page) =>
  page.getByRole('link', { name: 'My Account' });

// Cookie consent
export const cookieConsentBanner = (page: Page) =>
  page.getByText(
    'By clicking "Accept All Cookies", you agree to the storing of cookies on your device to enhance site navigation and analyze site usage.'
  );
export const acceptAllCookiesButton = (page: Page) =>
  page.getByRole('button', { name: 'Accept All Cookies', exact: true });
export const cookieSettingsButton = (page: Page) =>
  page.getByRole('button', { name: 'settings', exact: true });

// Header entry point (replaces the old PersonIcon avatar menu). The CRD app
// header now exposes a direct "Log in" link that initiates the Kratos flow.
export const logInHeaderLink = (page: Page) =>
  page.getByRole('link', { name: 'Log in', exact: true });

// Post-login the authenticated shell shows a one-time "A fresh new Alkemio is
// here" dialog inviting the user to switch design. We opt into the new CRD
// design ("Take me to the new design") so the authenticated shell matches the
// CRD experience. The dialog overlays the page and blocks interaction, so
// handle it right after sign-in.
export const dismissNewLookDialog = async (page: Page): Promise<void> => {
  const switchToNewDesign = page.getByRole('button', {
    name: /take me to the new design/i,
  });
  // The dialog renders a few seconds after the authenticated shell loads, so
  // poll for it. Returns quickly on screens where it never appears.
  for (let attempt = 0; attempt < 6; attempt++) {
    if (await switchToNewDesign.isVisible({ timeout: 1500 }).catch(() => false)) {
      await switchToNewDesign.click().catch(() => {});
      await page.waitForTimeout(500);
      return;
    }
    await page.waitForTimeout(750);
  }
};
