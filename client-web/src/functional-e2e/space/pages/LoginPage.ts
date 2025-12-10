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
    email: string = 'admin@alkem.io',
    userPassword: string = password
  ) {
    await this.goto();
    await this.acceptCookies();
    await this.page.getByTestId('PersonIcon').click();
    await this.page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
    await this.page.waitForURL(/.*login.*/);
    await this.page.getByRole('textbox', { name: 'E-Mail' }).fill(email);
    await this.page
      .getByRole('textbox', { name: 'Password' })
      .fill(userPassword);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
    await this.page.waitForURL(/.*home.*/);
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.page
      .getByRole('link', { name: 'My Account' })
      .isVisible({ timeout: 2000 })
      .catch(() => false);
  }
}
