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

/**
 * No settings to fill for "None" collection.
 */
export const fillCollectionNone = async (_page: Page): Promise<void> => {
  // No-op: nothing to configure
};

/**
 * No settings to edit for "None" collection.
 */
export const editCollectionNone = async (_page: Page): Promise<void> => {
  // No-op: nothing to configure
};
