/**
 * Collection: Memos
 * Enables responding with memos (collaborative documents).
 */

import { Page, expect } from '@playwright/test';
import { CalloutTemplateResponseMemos } from '../callout-template-form.models';

/**
 * Selects "Memos" for collection type.
 */
export const selectCollectionMemos = async (page: Page): Promise<void> => {
  // First expand Response Options if collapsed
  const expandButton = page.getByRole('button', { name: 'Expand' });
  if (await expandButton.isVisible()) {
    await expandButton.click();
  }

  // Select Memos in Collection section
  const collectionSection = page.getByRole('heading', { name: 'Collection' }).locator('..');
  const memosButton = collectionSection.getByRole('button', { name: 'Memos' });
  await memosButton.click();
};

/**
 * Opens Collection settings and configures memos options.
 */
export const fillCollectionMemos = async (
  page: Page,
  settings: CalloutTemplateResponseMemos
): Promise<void> => {
  // Open collection settings dialog
  await page.getByRole('button', { name: 'Collection settings' }).click();

  const settingsDialog = page.getByRole('dialog', { name: 'Collection settings' });
  await expect(settingsDialog).toBeVisible();

  // Fill default title
  if (settings.defaultTitle) {
    const titleField = settingsDialog.getByRole('textbox', { name: 'Title' });
    await titleField.fill(settings.defaultTitle);
  }

  // Fill default description
  if (settings.defaultDescription) {
    const descField = settingsDialog.getByRole('textbox', { name: 'Markdown editor' });
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

