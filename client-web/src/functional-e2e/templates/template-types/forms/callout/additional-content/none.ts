/**
 * Additional Content: None
 * No additional content - this is the default state.
 */

import { Page } from '@playwright/test';

/**
 * Selects "None" for additional content (no-op if already selected).
 */
export const selectAdditionalContentNone = async (
  page: Page
): Promise<void> => {
  const AdditionalContentBlock =
    page.locator('div').filter({ hasText: /^Additional Content$/ }).first();

  const noneButton = AdditionalContentBlock
    .getByRole('button', { name: 'None' });

  await noneButton.click();
};
