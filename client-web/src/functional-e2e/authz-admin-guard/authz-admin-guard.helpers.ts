import { expect, Locator, Page } from '@playwright/test';

/** `permissions.errorDenied` — shown when the server refuses a role change. */
export const DENIED_TOAST = "You don't have permission to make this change. The change was not saved.";
/** `permissions.denied` — tooltip on a control the client gates off. */
export const DENIED_TOOLTIP = "You don't have permission to change members of this role.";
/** `permissions.unverifiable` — tooltip when `myPrivileges` could not be read. */
export const UNVERIFIABLE_TOOLTIP = 'Permissions could not be verified.';

/** Space settings → "Community" tab, waiting for the members table. */
export const openSpaceCommunityTab = async (page: Page, baseUrl: string, spaceNameId: string) => {
  await page.goto(`${baseUrl}/${spaceNameId}/settings`);
  const communityTab = page.getByRole('tab', { name: 'Community' });
  await expect(communityTab).toBeVisible({ timeout: 15_000 });
  await communityTab.click();
  await expect(page.getByRole('heading', { name: 'Space Members' })).toBeVisible({ timeout: 15_000 });
};

/** Row "Actions" menu → "Change Role" → the "Member settings" dialog. */
export const openMemberSettingsDialog = async (page: Page, memberDisplayName: string): Promise<Locator> => {
  const row = page.getByRole('row').filter({ hasText: memberDisplayName });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await row.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Change Role' }).click();
  const dialog = page.getByRole('dialog', { name: 'Member settings' });
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * The three gated controls of the member dialog. The checkboxes are labelled
 * by their explanatory sentence ("This member is a lead: …" / "… an admin: …"),
 * the remove action is a button carrying the "Click here to remove…" copy.
 */
export const memberDialogControls = (dialog: Locator) => ({
  lead: dialog.getByRole('checkbox', { name: /this member is a lead/i }),
  admin: dialog.getByRole('checkbox', { name: /this member is an admin/i }),
  remove: dialog.getByRole('button', { name: /remove this member/i }),
});

/**
 * A `GatedAction` renders the disabled control inside a focusable wrapper that
 * carries the tooltip. Focus the wrapper (keyboard path) and read the tooltip.
 */
export const expectGatedWithReason = async (page: Page, control: Locator, reason: string) => {
  await expect(control).toBeDisabled();
  const wrapper = control.locator('xpath=ancestor::span[@tabindex="0"][1]');
  await wrapper.focus();
  // When several gated controls are checked in a row, the previous tooltip is
  // still in the DOM during its exit animation; the one just opened is
  // portalled last. Assert on that one rather than on a unique match.
  await expect(page.getByRole('tooltip').filter({ hasText: reason }).last()).toBeVisible();
};
