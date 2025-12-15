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
  const noneButton = page
    //.getByLabel('No additional content')
    .getByRole('button', { name: 'None' });
  // // .getByRole('heading', { name: 'Additional Content' })
  // // .locator('..')
  //.getByRole('button', { name: 'None' });

  await noneButton.click();
};

/**
 * No editing needed for "None" additional content.
 */
export const editAdditionalContentNone = async (_page: Page): Promise<void> => {
  // No-op: nothing to edit
};
