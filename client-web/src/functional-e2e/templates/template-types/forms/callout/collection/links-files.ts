/**
 * Collection: Links & Files
 * Enables responding with links and file uploads.
 */

import { Page, expect } from '@playwright/test';
import { CollectionLinksFiles } from '../callout-template-form.models';

/**
 * Selects "Links & Files" for collection type.
 */
export const selectCollectionLinksFiles = async (page: Page): Promise<void> => {
  // Select Links & Files in Collection section
  const collectionSection = page
    .getByRole('heading', { name: 'Collection' })
    .locator('..');
  const linksFilesButton = collectionSection.getByRole('button', {
    name: 'Links & Files',
  });
  await linksFilesButton.click();
};

/**
 * Opens Collection settings and configures permissions.
 */
export const fillCollectionLinksFiles = async (
  page: Page,
  settings: CollectionLinksFiles
): Promise<void> => {
  // Open collection settings dialog
  await page.getByRole('button', { name: 'Collection settings' }).click();

  const settingsDialog = page.getByRole('dialog', {
    name: 'Collection settings',
  });
  await expect(settingsDialog).toBeVisible();

  // Configure member permissions
  const membersCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Members can add to the collection',
  });
  const membersChecked = await membersCheckbox.isChecked();
  if (membersChecked !== settings.membersCanAdd) {
    await membersCheckbox.click();
  }

  // Configure admin permissions
  const adminsCheckbox = settingsDialog.getByRole('checkbox', {
    name: 'Admins can add to the collection',
  });
  const adminsChecked = await adminsCheckbox.isChecked();
  if (adminsChecked !== settings.adminsCanAdd) {
    await adminsCheckbox.click();
  }

  // Save and close
  await settingsDialog.getByRole('button', { name: 'Save' }).click();
  await expect(settingsDialog).not.toBeVisible();
};

/**
 * Edits collection settings (same as fill for links/files).
 */
export const editCollectionLinksFiles = fillCollectionLinksFiles;
