import { Locator, Page } from '@playwright/test';

/**
 * The redesigned templates settings page renders one accordion list item per
 * template section, each with its own section toggle button and an "Add new"
 * button. Positional nth() lookups broke when the "Classification templates"
 * section was inserted mid-list; scope by the section's own name instead.
 */
export const sectionAddNewButton = (
  page: Page,
  sectionName: RegExp
): Locator =>
  page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: sectionName }) })
    .getByRole('button', { name: 'Add new' });
