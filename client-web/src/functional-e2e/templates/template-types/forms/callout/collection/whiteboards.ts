/**
 * Collection: Whiteboards
 * Enables responding with whiteboards (Excalidraw canvases).
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateResponseWhiteboards } from '../callout-template-form.models';

/**
 * Selects "Whiteboards" for collection type.
 */
export const selectCollectionWhiteboards = async (dialog: Locator): Promise<void> => {
  // First expand Response Options if collapsed
  const whiteboardsButton = dialog.getByRole('button', {
    name: 'Whiteboards',
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

  const settingsDialog = page.getByRole('dialog', { name: 'Collection settings' });
  await expect(settingsDialog).toBeVisible();

  // Fill default title
  if (settings.defaultTitle) {
    const titleField = settingsDialog.getByRole('textbox', { name: 'Title' });
    await titleField.fill(settings.defaultTitle);
  }

  // Fill whiteboard canvas if text is provided
  if (settings.textInWhiteboard) {
    // Click Edit button to open Excalidraw editor
    const editButton = settingsDialog.getByRole('button', { name: 'Edit' });
    await editButton.click();

    // Wait for the whiteboard editor
    const canvas = page.locator('canvas.excalidraw__canvas').last();
    await expect(canvas).toBeVisible();

    // Select text tool
    await settingsDialog.getByRole('radio', { name: /Text — T or/i }).click();

    // Click on canvas to start text entry
    await canvas.click();

    // Type the text
    const textInput = settingsDialog.getByRole('textbox').last();
    await textInput.fill(settings.textInWhiteboard);

    // Press Escape to commit text
    await textInput.press('Escape');

    // Save the whiteboard
    await settingsDialog.getByRole('button', { name: 'Save' }).first().click();
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

