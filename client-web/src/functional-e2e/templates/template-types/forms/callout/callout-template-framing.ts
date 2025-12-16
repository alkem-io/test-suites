import { Page, expect } from '@playwright/test';
import { CalloutTemplateFramingCallToAction, CalloutTemplateFramingMemo, CalloutTemplateFramingWhiteboard } from './callout-template-form.models';


/**
 * Framing / Additional Content
 */

/**
 * "None"
 */
export const selectCalloutTemplateFramingNone = async (
  page: Page
): Promise<void> => {
  const additionalContentBlock = page.getByRole('heading', { name: 'Additional Content' }).locator('..').locator('..').locator('..').locator('..');
  const noneButton = additionalContentBlock
    .getByRole('button', { name: 'None' });

  await noneButton.click();
};

/**
 * "Call To Action"
 */
export const selectCalloutTemplateFramingCallToAction = async (page: Page): Promise<void> => {
  const ctaButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Call To Action' });

  await ctaButton.click();
};

export const fillCalloutTemplateFramingCallToAction = async (
  page: Page,
  content: CalloutTemplateFramingCallToAction
): Promise<void> => {
  // Fill CTA text field
  const ctaTextField = page.getByRole('textbox', { name: 'Call To Action', exact: true });
  await ctaTextField.fill(content.ctaText);

  // Fill URL field
  const urlField = page.getByRole('textbox', { name: 'URL', exact: true });
  await urlField.fill(content.ctaUrl);
};

/**
 * "Memo"
 */
export const selectCalloutTemplateFramingMemo = async (page: Page): Promise<void> => {
  const memoButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Memo' });

  await memoButton.click();
};

export const fillCalloutTemplateFramingMemo = async (
  page: Page,
  content: CalloutTemplateFramingMemo
): Promise<void> => {
  // The memo content appears as a markdown editor after the Additional Content section
  // Find the markdown editor that appears after selecting Memo
  const memoSection = page.getByRole('heading', { name: 'Additional Content' }).locator('..');
  const markdownEditor = memoSection
    .locator('..')
    .getByRole('textbox', { name: 'Markdown editor' })
    .last();

  await markdownEditor.click();
  await markdownEditor.fill(content.memoContent);
};


/**
 * "Whiteboard"
 */
export const selectCalloutTemplateFramingWhiteboard = async (page: Page): Promise<void> => {
  const whiteboardButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Whiteboard', exact: true });

  await whiteboardButton.click();
};

export const fillCalloutTemplateFramingWhiteboard = async (
  page: Page,
  content: CalloutTemplateFramingWhiteboard
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

