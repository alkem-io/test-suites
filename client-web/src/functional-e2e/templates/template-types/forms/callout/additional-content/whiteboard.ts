/**
 * Additional Content: Whiteboard
 * Adds a whiteboard canvas to the callout with Excalidraw editor.
 */

import { Page, expect } from '@playwright/test';
import { AdditionalContentWhiteboard } from '../callout-template-form.models';

/**
 * Selects "Whiteboard" for additional content.
 */
export const selectAdditionalContentWhiteboard = async (page: Page): Promise<void> => {
  const whiteboardButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Whiteboard', exact: true });

  await whiteboardButton.click();
};

/**
 * Opens the Excalidraw editor and adds text to the canvas.
 * This follows the same pattern as whiteboard-template-form.ts
 */
export const fillAdditionalContentWhiteboard = async (
  page: Page,
  content: AdditionalContentWhiteboard
): Promise<void> => {
  // Click Edit button to open Excalidraw editor
  const editButton = page.getByRole('button', { name: 'Edit' }).first();
  await editButton.click();

  // Wait for the whiteboard editor dialog
  const editorDialog = page.getByRole('dialog').filter({ hasText: 'Drawing canvas' });
  await expect(editorDialog).toBeVisible();

  // Select text tool
  await editorDialog.getByRole('radio', { name: /Text — T or/i }).click();

  // Click on canvas to start text entry
  const canvas = editorDialog.locator('canvas.excalidraw__canvas');
  await canvas.click();

  // Type the text
  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(content.textInWhiteboard);

  // Press Escape to commit text, then Save
  await textInput.press('Escape');
  await editorDialog.getByRole('button', { name: 'Save' }).click();

  // Wait for dialog to close
  await expect(editorDialog).not.toBeVisible();
};

/**
 * Edits existing whiteboard content by clearing and re-entering text.
 */
export const editAdditionalContentWhiteboard = async (
  page: Page,
  content: AdditionalContentWhiteboard
): Promise<void> => {
  // Click Edit button to open Excalidraw editor
  const editButton = page.getByRole('button', { name: 'Edit' }).first();
  await editButton.click();

  // Wait for the whiteboard editor dialog
  const editorDialog = page.getByRole('dialog').filter({ hasText: 'Drawing canvas' });
  await expect(editorDialog).toBeVisible();

  // Double-click existing text to select it (assuming there's text to edit)
  const canvas = editorDialog.locator('canvas.excalidraw__canvas');
  await canvas.dblclick();

  // Clear and type new text
  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(content.textInWhiteboard);

  // Press Escape to commit text, then Save
  await textInput.press('Escape');
  await editorDialog.getByRole('button', { name: 'Save' }).click();

  // Wait for dialog to close
  await expect(editorDialog).not.toBeVisible();
};
