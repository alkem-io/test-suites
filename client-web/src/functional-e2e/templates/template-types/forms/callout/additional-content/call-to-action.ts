/**
 * Additional Content: Call To Action
 * Adds a CTA button with text and URL to the callout.
 */

import { Page } from '@playwright/test';
import { AdditionalContentCallToAction } from '../callout-template-form.models';

/**
 * Selects "Call To Action" for additional content.
 */
export const selectAdditionalContentCallToAction = async (page: Page): Promise<void> => {
  const ctaButton = page
    .getByRole('heading', { name: 'Additional Content' })
    .locator('..')
    .getByRole('button', { name: 'Call To Action' });

  await ctaButton.click();
};

/**
 * Fills the Call To Action fields (text and URL).
 */
export const fillAdditionalContentCallToAction = async (
  page: Page,
  content: AdditionalContentCallToAction
): Promise<void> => {
  // Fill CTA text field
  const ctaTextField = page.getByRole('textbox', { name: 'Call To Action' });
  await ctaTextField.fill(content.ctaText);

  // Fill URL field
  const urlField = page.getByRole('textbox', { name: 'URL' });
  await urlField.fill(content.ctaUrl);
};

/**
 * Clears and edits the Call To Action fields.
 */
export const editAdditionalContentCallToAction = async (
  page: Page,
  content: AdditionalContentCallToAction
): Promise<void> => {
  // Clear and fill CTA text field
  const ctaTextField = page.getByRole('textbox', { name: 'Call To Action' });
  await ctaTextField.click();
  await ctaTextField.press('Control+a');
  await ctaTextField.fill(content.ctaText);

  // Clear and fill URL field
  const urlField = page.getByRole('textbox', { name: 'URL' });
  await urlField.click();
  await urlField.press('Control+a');
  await urlField.fill(content.ctaUrl);
};
