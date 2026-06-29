import { Page, expect } from '@playwright/test';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

export class LoginPage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  async goto() {
    await this.page.goto(this.baseUrl);
  }

  async acceptCookies() {
    const cookieButton = this.page.getByRole('button', {
      name: 'Accept All Cookies',
    });
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cookieButton.click();
    }
  }

  async login(
    email: string = process.env.AUTH_TEST_HARNESS_EMAIL || 'admin@alkem.io',
    userPassword: string = password
  ) {
    await this.goto();
    await this.acceptCookies();
    // CRD header exposes a direct "Log in" link. The click must happen in-SPA
    // (a full-page visit to /login does NOT initialise the Kratos sign-in flow,
    // so the form fields never render). Wait for the link to render before
    // clicking to avoid racing the SPA header.
    const loginLink = this.page.getByRole('link', {
      name: 'Log in',
      exact: true,
    });
    await loginLink.waitFor({ state: 'visible', timeout: 30_000 });
    await loginLink.click();
    await this.page.waitForURL(/.*login.*/);
    const emailField = this.page.getByRole('textbox', { name: 'E-Mail' });
    await emailField.waitFor({ state: 'visible', timeout: 30_000 });
    await emailField.fill(email);
    await this.page
      .getByRole('textbox', { name: 'Password' })
      .fill(userPassword);
    await this.page
      .getByRole('button', { name: 'Sign in', exact: true })
      .click();
    await this.page.waitForURL(/.*home.*/, { timeout: 30_000 });
    // Handle the one-time "A fresh new Alkemio is here" dialog that overlays the
    // shell after sign-in, opting into the new CRD design for consistency with
    // the rest of the authentication suite.
    const switchToNewDesign = this.page.getByRole('button', {
      name: /take me to the new design/i,
    });
    if (await switchToNewDesign.isVisible({ timeout: 5000 }).catch(() => false)) {
      await switchToNewDesign.click().catch(() => {});
    }
  }

  // async isLoggedIn(): Promise<boolean> {
  //   return await this.page
  //     .getByRole('link', { name: 'My Account' })
  //     .isVisible({ timeout: 2000 })
  //     .catch(() => false);
  // }
}
