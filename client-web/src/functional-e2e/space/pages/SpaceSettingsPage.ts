import { Page, expect } from '@playwright/test';

export class SpaceSettingsPage {
  constructor(private page: Page) {}

  // Settings tabs
  get aboutTab() {
    return this.page.getByRole('tab', { name: 'About' });
  }

  get layoutTab() {
    return this.page.getByRole('tab', { name: 'Layout' });
  }

  get communityTab() {
    return this.page.getByRole('tab', { name: 'community' });
  }

  get updatesTab() {
    return this.page.getByRole('tab', { name: 'Updates from the leads' });
  }

  get subspacesTab() {
    return this.page.getByRole('tab', { name: 'Subspaces' });
  }

  get templatesTab() {
    return this.page.getByRole('tab', { name: 'Templates' });
  }

  get storageTab() {
    return this.page.getByRole('tab', { name: 'storage' });
  }

  get settingsTab() {
    return this.page.getByRole('tab', { name: 'Settings' });
  }

  get accountTab() {
    return this.page.getByRole('tab', { name: 'account' });
  }

  // Account tab elements. CRD renders delete under an Account-tab
  // "Danger Zone" as a "Delete this Space" button.
  get deleteSpaceButton() {
    return this.page.getByRole('button', { name: 'Delete this Space' });
  }

  // CRD confirmation is a Radix alertdialog "Delete Space" with no checkbox;
  // a "Delete Space" button confirms (replacing the old checkbox + "Yes,
  // delete" flow).
  get deleteDialog() {
    return this.page.getByRole('alertdialog', { name: 'Delete Space' });
  }

  get confirmDeleteButton() {
    return this.deleteDialog.getByRole('button', { name: 'Delete Space' });
  }

  // Methods
  async navigateToAccount() {
    await expect(this.accountTab).toBeVisible();
    await this.accountTab.click();
  }

  async deleteSpace() {
    await this.navigateToAccount();
    await this.deleteSpaceButton.click();
    await expect(this.deleteDialog).toBeVisible();
    await this.confirmDeleteButton.click();
    // Wait for redirect after deletion
    await this.page.waitForURL(/.*\/(home|spaces|account).*/, {
      timeout: 30_000,
    });
  }
}
