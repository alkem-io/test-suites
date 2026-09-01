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
  closeWhiteboardEditor,
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
      // The editor autosaves — closing it finalizes the drawing (no Save button).
      await closeWhiteboardEditor(editorDialog);
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
      // Selecting "Call to Action" reveals two inputs - validated against the
      // live CRD UI:
      //   #link-framing-url           <input type="url"> labelled "URL"
      //   #link-framing-display-name  <input type="text"> labelled "Display Name"
      // Stable IDs are used rather than getByLabel('URL') because reference
      // rows also expose a "URL" textbox, which would collide with role+name
      // / label lookups when both CTA framing and references are present.
      await dialog.locator('#link-framing-url').fill(framing.ctaUrl);
      await dialog
        .locator('#link-framing-display-name')
        .fill(framing.ctaText);
      return;
    }

    case 'poll': {
      await framingRadio(dialog, 'Poll').click();

      // Question (single line)
      await dialog
        .getByRole('textbox', { name: 'Question' })
        .fill(framing.question);

      // The Poll editor seeds two `textbox "Option N"` inputs. To support more,
      // click "Add Option" until the count matches options.length; fewer than 2
      // is not supported by the UI (minimum two seeded slots).
      const desiredOptions = Math.max(2, framing.options.length);
      for (let i = 2; i < desiredOptions; i++) {
        await dialog.getByRole('button', { name: 'Add Option' }).click();
      }
      for (let i = 0; i < framing.options.length; i++) {
        await dialog
          .getByRole('textbox', { name: `Option ${i + 1}`, exact: true })
          .fill(framing.options[i]);
      }

      // Open the "Poll Settings" sub-dialog. The poll editor's "Settings"
      // button is the only `button "Settings"` inside the template dialog
      // (the space banner's "Settings" is a `link`, different role).
      await dialog.getByRole('button', { name: 'Settings', exact: true }).click();
      const settingsDialog = page.getByRole('dialog', { name: 'Poll Settings' });
      await expect(settingsDialog).toBeVisible();

      await setPollSwitch(
        settingsDialog.getByRole('switch', { name: 'Allow multiple responses' }),
        framing.settings.allowMultipleResponses
      );
      await setPollSwitch(
        settingsDialog.getByRole('switch', {
          name: 'Allow contributors to add options',
        }),
        framing.settings.allowContributorsToAddOptions
      );
      await setPollSwitch(
        settingsDialog.getByRole('switch', {
          name: 'Hide results until user votes',
        }),
        framing.settings.hideResultsUntilUserVotes
      );
      await setPollSwitch(
        settingsDialog.getByRole('switch', { name: 'Show voter avatars' }),
        framing.settings.showVoterAvatars
      );

      // The Poll Settings dialog has no Save button — toggles auto-apply and
      // Escape closes it cleanly (no discard prompt). Validated against the
      // live CRD UI on 2026-05-19.
      await page.keyboard.press('Escape');
      await expect(settingsDialog).not.toBeVisible();
      return;
    }
  }
};

/** Local switch setter — kept private so the framing helper is self-contained. */
const setPollSwitch = async (sw: Locator, desired: boolean): Promise<void> => {
  if ((await sw.isChecked()) !== desired) {
    await sw.click();
  }
};
