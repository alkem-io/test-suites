import { Page, expect } from '@playwright/test';

export class OrganizationAccountPage {
  constructor(
    private page: Page,
    private baseUrl: string = process.env.ALKEMIO_BASE_URL ||
      'http://localhost:3000'
  ) {}

  async goto(organizationNameId: string) {
    await this.page.goto(
      `${this.baseUrl}/organization/${organizationNameId}/settings/account`
    );
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
