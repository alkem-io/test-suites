/**
 * Callout template response collection helpers.
 *
 * In the redesigned dialog, the response collection is chosen from the
 * "Responses" radiogroup (Links & Files / Posts / Memos / Whiteboards).
 * Selecting one reveals inline "Members can add" / "Admins can add" /
 * "Enable comments" switches and a "Set Default Response" button that opens a
 * "<Type> defaults" sub-dialog.
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateResponseCollection } from '../callout-template-form.models';
import {
  closeWhiteboardEditor,
  getWhiteboardEditorDialog,
  writeTextInWhiteboardDialog,
} from '../../whiteboards/whiteboard-dialog';

const setSwitch = async (sw: Locator, desired: boolean): Promise<void> => {
  if ((await sw.isChecked()) !== desired) {
    await sw.click();
  }
};

/**
 * Selects a "Responses" chip. Since client-web#10373 the strip surfaces Links &
 * Files and Posts, plus Tasks or (without Tasks) Whiteboards; the rest, Memos
 * among them, sit in the "More ways to respond" menu. A type chosen there
 * joins the row, checked.
 */
const selectResponseType = async (
  page: Page,
  dialog: Locator,
  name: string
): Promise<void> => {
  const group = dialog.getByRole('radiogroup', { name: 'Responses' });
  await expect(group).toBeVisible();
  const radio = group.getByRole('radio', { name, exact: true });
  if ((await radio.count()) === 0) {
    await dialog.getByRole('button', { name: 'More ways to respond' }).click();
    await page.getByRole('menuitem', { name, exact: true }).click();
  } else {
    await radio.click();
  }
  await expect(radio).toHaveAttribute('aria-checked', 'true');
};

const setContributionPermissions = async (
  dialog: Locator,
  settings: { membersCanAdd: boolean; adminsCanAdd: boolean }
): Promise<void> => {
  await setSwitch(
    dialog.getByRole('switch', { name: 'Members can add' }),
    settings.membersCanAdd
  );
  await setSwitch(
    dialog.getByRole('switch', { name: 'Admins can add' }),
    settings.adminsCanAdd
  );
};

const openDefaultResponseDialog = async (
  page: Page,
  dialog: Locator
): Promise<Locator> => {
  await dialog.getByRole('button', { name: 'Set Default Response' }).click();
  const defaultsDialog = page.getByRole('dialog', { name: /defaults$/ });
  await expect(defaultsDialog).toBeVisible();
  return defaultsDialog;
};

export const selectAndFillCalloutCollection = async (
  page: Page,
  dialog: Locator,
  collection: CalloutTemplateResponseCollection
): Promise<void> => {
  switch (collection.type) {
    case 'none':
      // No "Responses" option selected.
      return;

    case 'linksFiles':
      await selectResponseType(page, dialog, 'Links & Files');
      await setContributionPermissions(dialog, collection);
      return;

    case 'posts': {
      await selectResponseType(page, dialog, 'Posts');
      await setContributionPermissions(dialog, collection);
      await setSwitch(
        dialog.getByRole('switch', { name: 'Enable comments' }),
        collection.enableCommentsOnPosts
      );
      const defaultsDialog = await openDefaultResponseDialog(page, dialog);
      await defaultsDialog
        .getByRole('textbox', { name: 'Default title' })
        .fill(collection.defaultTitle);
      await defaultsDialog
        .getByRole('textbox', {
          name: 'Guidance shown when a member starts a new contribution',
        })
        .fill(collection.defaultDescription);
      await defaultsDialog.getByRole('button', { name: 'Save' }).click();
      await expect(defaultsDialog).not.toBeVisible();
      return;
    }

    case 'memos': {
      await selectResponseType(page, dialog, 'Memos');
      await setContributionPermissions(dialog, collection);
      const defaultsDialog = await openDefaultResponseDialog(page, dialog);
      await defaultsDialog
        .getByRole('textbox', { name: 'Default title' })
        .fill(collection.defaultTitle);
      // Memos defaults dialog reuses the same rich-text editor as Posts -
      // confirmed against the live CRD UI (May 2026).
      await defaultsDialog
        .getByRole('textbox', {
          name: 'Guidance shown when a member starts a new contribution',
        })
        .fill(collection.defaultDescription);
      await defaultsDialog.getByRole('button', { name: 'Save' }).click();
      await expect(defaultsDialog).not.toBeVisible();
      return;
    }

    case 'whiteboards': {
      await selectResponseType(page, dialog, 'Whiteboards');
      await setContributionPermissions(dialog, collection);
      const defaultsDialog = await openDefaultResponseDialog(page, dialog);
      await defaultsDialog
        .getByRole('textbox', { name: 'Default title' })
        .fill(collection.defaultTitle);
      // Since the whiteboard-draft rework (server#6399 removed
      // `Whiteboard.content`; client-web#10205/#10213) the default whiteboard
      // is a server-owned DRAFT that is materialised asynchronously when the
      // defaults dialog opens. Its labelled "Edit" button (the icon-only
      // thumbnail one comes first in DOM order) therefore appears with a delay
      // — wait for it explicitly instead of the default 5 s expect budget.
      const editDrawing = defaultsDialog.getByRole('button', { name: 'Edit', exact: true }).last();
      await expect(editDrawing).toBeVisible({ timeout: 20_000 });
      await editDrawing.click();
      const editorDialog = await getWhiteboardEditorDialog(page);
      await writeTextInWhiteboardDialog(editorDialog, collection.textInWhiteboard);
      await closeWhiteboardEditor(editorDialog);
      await defaultsDialog.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(defaultsDialog).not.toBeVisible();
      return;
    }
  }
};
