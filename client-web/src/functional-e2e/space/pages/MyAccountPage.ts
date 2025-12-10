import { Page, expect } from '@playwright/test';

export class MyAccountPage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  async goto() {
    await this.page.goto(`${this.baseUrl}/user/account`);
  }

  get hostedSpacesHeading() {
    return this.page.getByRole('heading', { name: 'Hosted Spaces' });
  }

  get addSpaceButton() {
    return this.page.getByRole('button', { name: 'Add' }).first();
  }

  async openCreateSpaceDialog() {
    await this.addSpaceButton.click();
  }

  async verifyHostedSpacesVisible() {
    await expect(this.hostedSpacesHeading).toBeVisible();
  }
}
