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
    // CRD nests "Create Space" / "Create New Space" inside the Hosted Spaces
    // section heading, which leaves the heading's computed accessible name
    // unreliable; assert the section via its stable label text instead.
    return this.page.getByText('Hosted Spaces').first();
  }

  get addSpaceButton() {
    // CRD replaces the generic "Add" button with an explicit "Create Space"
    // button in the Hosted Spaces section header.
    return this.page.getByRole('button', { name: 'Create Space' });
  }

  async openCreateSpaceDialog() {
    // Wait for the Hosted Spaces section to render before clicking, so the
    // "Create Space" button is wired up (avoids a click that opens nothing).
    await expect(this.hostedSpacesHeading).toBeVisible({ timeout: 15_000 });
    await this.addSpaceButton.waitFor({ state: 'visible', timeout: 15_000 });
    await this.addSpaceButton.click();
    await expect(
      this.page.getByRole('dialog', { name: 'Create new Space' })
    ).toBeVisible({ timeout: 15_000 });
  }

  async verifyHostedSpacesVisible() {
    await expect(this.hostedSpacesHeading).toBeVisible();
  }
}
