/**
 * Callout template framing ("Add to post") helpers.
 *
 * In the redesigned dialog, framing is chosen from the "Add to post"
 * radiogroup (Whiteboard / Memo / Document / Call to Action / Media Gallery /
 * Poll). When a radio is selected, type-specific inputs appear below it.
 */

import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateFraming } from './callout-template-form.models';
import {
  getWhiteboardEditorDialog,
  writeTextInWhiteboardDialog,
} from '../whiteboards/whiteboard-dialog';

const framingRadio = (dialog: Locator, name: string): Locator =>
  dialog
    .getByRole('radiogroup', { name: 'Add to post' })
    .getByRole('radio', { name, exact: true });

export const selectAndFillCalloutTemplateFraming = async (
  page: Page,
  dialog: Locator,
  framing: CalloutTemplateFraming
): Promise<void> => {
  switch (framing.type) {
    case 'none':
      // No "Add to post" option selected.
      return;

    case 'whiteboard': {
      await framingRadio(dialog, 'Whiteboard').click();
      // After selecting Whiteboard framing, two "Edit" buttons appear in the
      // framing section: an icon-only one (preview thumbnail) and a labeled
      // one (drawing). The labeled one - last in DOM order - opens the editor.
      await dialog
        .getByRole('button', { name: 'Edit', exact: true })
        .last()
        .click();
      const editorDialog = await getWhiteboardEditorDialog(page);
      await writeTextInWhiteboardDialog(editorDialog, framing.textInWhiteboard);
      await editorDialog.getByRole('button', { name: 'Save' }).click();
      await expect(editorDialog).not.toBeVisible();
      return;
    }

    case 'memo': {
      await framingRadio(dialog, 'Memo').click();
      // Selecting Memo reveals a dedicated rich-text editor with accessible
      // name "Write your memo…". DO NOT use "Write something..." - that's the
      // callout description and writing there would overwrite it.
      await dialog
        .getByRole('textbox', { name: 'Write your memo…' })
        .fill(framing.memoContent);
      return;
    }

    case 'callToAction': {
      await framingRadio(dialog, 'Call to Action').click();
      // Selecting "Call to Action" reveals two inputs labelled "URL" and
      // "Display Name". Target them by their stable IDs - reference rows also
      // expose a "URL" textbox, which would collide with role+name lookup.
      await dialog.locator('#link-framing-url').fill(framing.ctaUrl);
      await dialog
        .locator('#link-framing-display-name')
        .fill(framing.ctaText);
      return;
    }
  }
};
