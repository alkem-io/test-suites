/**
 * Additional Content: Memo
 * Adds a collaborative document (markdown) to the callout.
 */

import { Page, expect } from '@playwright/test';
import { AdditionalContentMemo } from '../callout-template-form.models';

/**
 * Selects "Memo" for additional content.
 */
export const selectAdditionalContentMemo = async (page: Page): Promise<void> => {
  const memoButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Memo' });

  await memoButton.click();
};

/**
 * Fills the memo content markdown editor.
 * The memo editor appears inline after selecting the Memo button.
 */
export const fillAdditionalContentMemo = async (
  page: Page,
  content: AdditionalContentMemo
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
 * Clears and edits the memo content.
 */
export const editAdditionalContentMemo = async (
  page: Page,
  content: AdditionalContentMemo
): Promise<void> => {
  // Find the memo markdown editor
  const memoSection = page.getByRole('heading', { name: 'Additional Content' }).locator('..');
  const markdownEditor = memoSection
    .locator('..')
    .getByRole('textbox', { name: 'Markdown editor' })
    .last();

  await markdownEditor.click();
  // Select all and replace
  await markdownEditor.press('Control+a');
  await markdownEditor.fill(content.memoContent);
};
