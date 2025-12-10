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
    await this.page.getByRole('link', { name: 'My Account' }).click();
  }

  get myAccountLink() {
    return this.page.getByRole('link', { name: 'My Account' });
  }
}
