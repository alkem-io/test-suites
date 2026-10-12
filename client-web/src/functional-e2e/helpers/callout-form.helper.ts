import { expect, Locator } from '@playwright/test';

/**
 * The two chip strips of the Create Post dialog (client-web
 * `FramingChipStrip` / `ResponseTypeChipStrip`) show a few chips on the
 * surface and fold the rest behind a "More" menu once five or more are
 * available. The menu trigger is named after the strip; menu items carry the
 * chip label. A chosen chip then surfaces in the row as the checked radio,
 * which is the signal these helpers wait for.
 */
async function chooseChip(dialog: Locator, label: string, moreMenuName: string): Promise<void> {
  const chip = dialog.getByRole('radio', { name: label, exact: true });
  if (await chip.isVisible()) {
    await chip.click();
  } else {
    await dialog.getByRole('button', { name: moreMenuName }).click();
    await dialog.page().getByRole('menuitem', { name: label, exact: true }).click();
  }
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-checked', 'true');
}

/**
 * Picks an "Add to Post" framing chip — 'Whiteboard', 'Memo', 'Media gallery'
 * on the surface; 'Call to Action', 'Poll', 'Contributors', 'Subspaces',
 * 'Form', 'Document'… behind "More to add".
 */
export const chooseFramingChip = (dialog: Locator, label: string) =>
  chooseChip(dialog, label, 'More to add');

/**
 * Picks a "Responses" chip — 'Links & Files', 'Posts', 'Tasks board' on the
 * surface; 'Memos', 'Whiteboards'… behind "More ways to respond".
 */
export const chooseResponseChip = (dialog: Locator, label: string) =>
  chooseChip(dialog, label, 'More ways to respond');
