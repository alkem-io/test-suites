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

  // Account tab elements
  get deleteSpaceButton() {
    return this.page.getByText('Delete this Space', { exact: true });
  }

  // Delete dialog
  get deleteDialog() {
    return this.page.getByRole('dialog');
  }

  get deleteConfirmCheckbox() {
    return this.page.getByRole('checkbox', {
      name: 'Please check this box if you',
    });
  }

  get confirmDeleteButton() {
    return this.page.getByRole('button', { name: 'Yes, delete' });
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
    await this.deleteConfirmCheckbox.click();
    await this.confirmDeleteButton.click();
    // Wait for redirect after deletion
    await this.page.waitForURL(/.*\/(home|spaces).*/);
  }
}
