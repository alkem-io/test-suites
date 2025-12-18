/**
 * Collection: None
 * No collection - callout does not accept responses.
 */

import { Locator } from '@playwright/test';

/**
 * Selects "None" for collection type.
 */
export const selectCollectionNone = async (dialog: Locator): Promise<void> => {
  // Select None in Collection section
  const noneButton = dialog
    .getByLabel('No collection')
    .getByRole('button', { name: 'None' });
  await noneButton.click();
};

