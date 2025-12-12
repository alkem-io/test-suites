/**
 * Collection: None
 * No collection - callout does not accept responses.
 */

import { Page } from '@playwright/test';

/**
 * Selects "None" for collection type.
 */
export const selectCollectionNone = async (page: Page): Promise<void> => {
  // First expand Response Options if collapsed
  const expandButton = page.getByRole('button', { name: 'Expand' });
  if (await expandButton.isVisible()) {
    await expandButton.click();
  }

  // Select None in Collection section
  const collectionSection = page.getByRole('heading', { name: 'Collection' }).locator('..');
  const noneButton = collectionSection.getByRole('button', { name: 'None' });
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
