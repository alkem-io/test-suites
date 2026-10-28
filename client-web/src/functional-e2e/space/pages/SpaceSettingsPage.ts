import { Page, expect } from '@playwright/test';
import { openSettingsSection } from '../../helpers/settings-section.helper';

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
    // client-web#10437: "Danger Zone" is a collapsible `SettingsSection` that
    // starts collapsed — its body (and the delete button) is in the DOM but
    // hidden until the h3 trigger is clicked.
    await openSettingsSection(this.page, 'Danger Zone');
    await expect(this.deleteSpaceButton).toBeVisible();
    await this.deleteSpaceButton.click();
    await expect(this.deleteDialog).toBeVisible();
    // The client redirects as soon as the delete is sent; the server-side
    // cascade (callouts, community, account bookkeeping) completes a moment
    // later. Returning on the redirect alone let the next step load an
    // account page that still referenced the half-deleted Space ("Could not
    // load relation 'about' for Space", every capacity badge "Not
    // available"). Wait for the mutation's own response, and for it to be
    // error-free, before handing control back.
    const deleted = this.page.waitForResponse(
      response =>
        response.url().includes('graphql') &&
        (response.request().postData() ?? '').includes('deleteSpace'),
      { timeout: 30_000 }
    );
    await this.confirmDeleteButton.click();
    const response = await deleted;
    const body = (await response.json().catch(() => ({}))) as { errors?: unknown[] };
    expect(body.errors, 'deleteSpace mutation errors').toBeUndefined();
    await this.page.waitForURL(/.*\/(home|spaces|account).*/, {
      timeout: 30_000,
    });
  }
}
