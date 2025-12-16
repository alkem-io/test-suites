/**
 * Collection: None
 * No collection - callout does not accept responses.
 */

import { Page } from '@playwright/test';

/**
 * Selects "None" for collection type.
 */
export const selectCollectionNone = async (page: Page): Promise<void> => {
  // Select None in Collection section
  const noneButton = page
    .getByLabel('No collection')
    .getByRole('button', { name: 'None' });
  await noneButton.click();
};

