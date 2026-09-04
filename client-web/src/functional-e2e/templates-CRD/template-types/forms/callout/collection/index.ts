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

const responseRadio = (dialog: Locator, name: string): Locator =>
  dialog
    .getByRole('radiogroup', { name: 'Responses' })
    .getByRole('radio', { name, exact: true });

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
      await responseRadio(dialog, 'Links & Files').click();
      await setContributionPermissions(dialog, collection);
      return;

    case 'posts': {
      await responseRadio(dialog, 'Posts').click();
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
      await responseRadio(dialog, 'Memos').click();
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
      await responseRadio(dialog, 'Whiteboards').click();
      await setContributionPermissions(dialog, collection);
      const defaultsDialog = await openDefaultResponseDialog(page, dialog);
      await defaultsDialog
        .getByRole('textbox', { name: 'Default title' })
        .fill(collection.defaultTitle);
      // The "Default whiteboard" section has two Edit buttons (icon-only
      // thumbnail and labeled). The labeled one - last in DOM order - opens
      // the Excalidraw editor. (NB: `openWhiteboardEditor` from
      // whiteboard-dialog.ts looks for `Start drawing` / `Edit drawing`
      // which only exist in the standalone whiteboard-template form, not
      // here.)
      await defaultsDialog
        .getByRole('button', { name: 'Edit', exact: true })
        .last()
        .click();
      const editorDialog = await getWhiteboardEditorDialog(page);
      await writeTextInWhiteboardDialog(editorDialog, collection.textInWhiteboard);
      // The editor autosaves — closing it finalizes the drawing (no Save button).
      await closeWhiteboardEditor(editorDialog);
      await defaultsDialog.getByRole('button', { name: 'Save' }).click();
      await expect(defaultsDialog).not.toBeVisible();
      return;
    }
  }
};
