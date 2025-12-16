import { Page, expect } from '@playwright/test';
import { CalloutTemplateFramingCallToAction, CalloutTemplateFramingMemo, CalloutTemplateFramingWhiteboard } from './callout-template-form.models';
import { clickOnEditWhiteboardPreview, getWhiteboardDialog, writeTextInWhiteboardDialog } from '../whiteboards/whiteboard-dialog';


/**
 * Framing / Additional Content
 */
const findFramingSection = (page: Page) => {
  return page.getByRole('heading', { name: 'Additional Content' }).locator('..').locator('..').locator('..').locator('..');
}


/**
 * "None"
 */
export const selectCalloutTemplateFramingNone = async (
  page: Page
): Promise<void> => {
  const noneButton = findFramingSection(page)
    .getByRole('button', { name: 'None' });

  await noneButton.click();
};

/**
 * "Call To Action"
 */
export const selectCalloutTemplateFramingCallToAction = async (page: Page): Promise<void> => {
  const ctaButton = findFramingSection(page)
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
  const memoButton = findFramingSection(page)
    .getByRole('button', { name: 'Memo' });

  await memoButton.click();
};

export const fillCalloutTemplateFramingMemo = async (
  page: Page,
  content: CalloutTemplateFramingMemo
): Promise<void> => {
  // The memo content is the third markdown editor in the form
  // (after template description and callout description)
  const markdownEditor = page
    .getByRole('textbox', { name: 'Markdown editor' })
    .nth(2);

  await markdownEditor.click();
  await markdownEditor.fill(content.memoContent);
};


/**
 * "Whiteboard"
 */
export const selectCalloutTemplateFramingWhiteboard = async (page: Page): Promise<void> => {
  const whiteboardButton = findFramingSection(page)
    .getByRole('button', { name: 'Whiteboard', exact: true });

  await whiteboardButton.click();
};

export const fillCalloutTemplateFramingWhiteboard = async (
  page: Page,
  content: CalloutTemplateFramingWhiteboard
): Promise<void> => {
  await clickOnEditWhiteboardPreview(page);

  const editorDialog = await getWhiteboardDialog(page, 'Edit whiteboard');

  await writeTextInWhiteboardDialog(editorDialog, content.textInWhiteboard);

  await editorDialog.getByRole('button', { name: 'Save' }).click();

  // Wait for dialog to close
  await expect(editorDialog).not.toBeVisible();
};

