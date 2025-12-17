/**
 * Collection: Links & Files
 * Enables responding with links and file uploads.
 */

import { Page, expect } from '@playwright/test';
import { CalloutTemplateResponseLinksFiles } from '../callout-template-form.models';

/**
 * Selects "Links & Files" for collection type.
 */
export const selectCollectionLinksFiles = async (page: Page): Promise<void> => {
  // Select Links & Files in Collection section
  // Use the aria-label description to find the button
  const linksFilesButton = page.getByRole('button', {
    name: 'Links & Files',
  }).filter({ has: page.locator('text=Links & Files') });

  await linksFilesButton.scrollIntoViewIfNeeded();
  await linksFilesButton.click();
};

/**
 * Opens Collection settings and configures permissions.
 */
export const fillCollectionLinksFiles = async (
  page: Page,
  settings: CalloutTemplateResponseLinksFiles
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

