/**
 * Collection: Whiteboards
 * Enables responding with whiteboards (Excalidraw canvases).
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateResponseWhiteboards } from '../callout-template-form.models';
import {
  clickOnEditWhiteboardPreview,
  getWhiteboardDialog,
  writeTextInWhiteboardDialog,
} from '../../whiteboards/whiteboard-dialog';

/**
 * Selects "Whiteboards" for collection type.
 */
export const selectCollectionWhiteboards = async (
  dialog: Locator
): Promise<void> => {
  // First expand Response Options if collapsed - use exact match to avoid matching chip/tag elements
  const whiteboardsButton = dialog.getByRole('button', {
    name: 'Whiteboards',
    exact: true,
  });

  await whiteboardsButton.click();
};

/**
 * Opens Collection settings and configures whiteboards options.
 * Note: Whiteboards collection has a default whiteboard canvas instead of markdown description.
 */
export const fillCollectionWhiteboards = async (
  page: Page,
  dialog: Locator,
  settings: CalloutTemplateResponseWhiteboards
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

  // Fill whiteboard canvas if text is provided
  if (settings.textInWhiteboard) {
    await clickOnEditWhiteboardPreview(page);

    const editorDialog = await getWhiteboardDialog(page, 'Edit whiteboard');

    // Wait for the whiteboard editor
    await writeTextInWhiteboardDialog(editorDialog, settings.textInWhiteboard);

    // Save the whiteboard
    await editorDialog.getByRole('button', { name: 'Save' }).first().click();
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

  // Save and close the settings dialog
  await settingsDialog.getByRole('button', { name: 'Save' }).click();
  await expect(settingsDialog).not.toBeVisible();
};
