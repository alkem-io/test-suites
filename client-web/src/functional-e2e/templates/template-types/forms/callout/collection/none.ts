/**
 * Collection: None
 * No collection - callout does not accept responses.
 */

import { Locator } from '@playwright/test';

/**
 * Selects "None" for collection type.
 * Note: "None" is selected by default, so this is a no-op.
 */
export const selectCollectionNone = async (_dialog: Locator): Promise<void> => {
  // "None" is selected by default in the Collection section - no action needed
};
