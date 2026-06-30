import { Page, expect } from '@playwright/test';

export class HomePage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  async goto() {
    await this.page.goto(`${this.baseUrl}/home`);
  }

  async navigateToMyAccount() {
    // CRD: "My Account" is primarily a menuitem inside the header user menu
    // (the avatar/"Beta" button); some home states also expose a direct link.
    // Try the direct link first, then fall back to opening the user menu.
    const directLink = this.page.getByRole('link', { name: 'My Account' });
    if (await directLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directLink.click();
      return;
    }
    await this.page.getByRole('button', { name: /Beta/ }).last().click();
    await this.page.getByRole('menuitem', { name: 'My Account' }).click();
  }

  get myAccountLink() {
    return this.page.getByRole('link', { name: 'My Account' });
  }
}
