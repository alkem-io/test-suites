/**
 * Collection: Memos
 * Enables responding with memos (collaborative documents).
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateResponseMemos } from '../callout-template-form.models';

/**
 * Selects "Memos" for collection type.
 */
export const selectCollectionMemos = async (dialog: Locator): Promise<void> => {
  // First expand Response Options if collapsed - use exact match to avoid matching chip/tag elements
  const memosButton = dialog.getByRole('button', {
    name: 'Memos',
    exact: true,
  });

  await memosButton.click();
};

/**
 * Opens Collection settings and configures memos options.
 */
export const fillCollectionMemos = async (
  page: Page,
  dialog: Locator,
  settings: CalloutTemplateResponseMemos
): Promise<void> => {
  // Open collection settings dialog
  await dialog.getByRole('button', { name: 'Collection settings' }).click();

  const settingsDialog = page.getByRole('dialog', {
    name: 'Collection settings',
  });
  await expect(settingsDialog).toBeVisible();

  // Fill default title
  if (settings.defaultTitle) {
    const titleField = settingsDialog.getByRole('textbox', { name: 'Title' });
    await titleField.fill(settings.defaultTitle);
  }

  // Fill default description
  if (settings.defaultDescription) {
    const descField = settingsDialog.getByRole('textbox', {
      name: 'Markdown editor',
    });
    await descField.fill(settings.defaultDescription);
  }

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
