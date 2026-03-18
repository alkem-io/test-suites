/**
 * Collection: Links & Files
 * Enables responding with links and file uploads.
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateResponseLinksFiles } from '../callout-template-form.models';
import { time } from 'console';

/**
 * Selects "Links & Files" for collection type.
 */
export const selectCollectionLinksFiles = async (
  dialog: Locator
): Promise<void> => {
  // Select Links & Files button in Collection section
  // Target the button inside the container with accessible name "Enable responding with links & files"
  const linksFilesButton = dialog
    .getByLabel('Enable responding with links & files')
    .getByRole('button');

  await linksFilesButton.scrollIntoViewIfNeeded({ timeout: 5000 });
  await linksFilesButton.click({ timeout: 1000 });
};

/**
 * Opens Collection settings and configures permissions.
 */
export const fillCollectionLinksFiles = async (
  page: Page,
  dialog: Locator,
  settings: CalloutTemplateResponseLinksFiles
): Promise<void> => {
  // Open collection settings dialog
  await dialog.getByRole('button', { name: 'Collection settings' }).click();

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
