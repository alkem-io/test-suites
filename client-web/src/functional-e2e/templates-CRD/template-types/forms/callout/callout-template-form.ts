/**
 * Callout (Collaboration tool) Template Form Orchestrator
 *
 * Fills the redesigned "Create / Edit collaboration-tool template" dialog.
 *
 * New dialog structure (CRD UI):
 *  - Template name / Description / Tags (handled by fillTemplateForm)
 *  - Title                                  -> callout title
 *  - "Write something..." rich-text editor  -> callout description
 *  - "Add to post" radiogroup               -> framing (Whiteboard / Memo / Call to Action / ...)
 *  - "Responses" radiogroup                 -> collection (Links & Files / Posts / Memos / Whiteboards)
 *      + inline "Members can add" / "Admins can add" / "Enable comments" switches
 *      + "Set Default Response" button -> "<Type> defaults" sub-dialog (default title + description / whiteboard)
 *  - "Tags" textbox (comma-separated)       -> callout tags
 *  - "Allow comments" switch                -> callout comments enabled
 *  - References ("Add another reference")    -> callout references
 *  - Cancel / Save
 */

import { Locator, Page } from '@playwright/test';
import { fillTemplateForm } from '../template-form';
import { CalloutTemplateForm } from './callout-template-form.models';
import { selectAndFillCalloutTemplateFraming } from './callout-template-framing';
import { selectAndFillCalloutCollection } from './collection';

/** Returns the create/edit collaboration-tool template dialog. */
export const getCalloutTemplateDialog = (page: Page): Locator =>
  page
    .getByRole('dialog')
    .filter({
      has: page.getByRole('heading', { name: /collaboration-tool template$/ }),
    });

/** Sets a switch element to the desired checked state. */
export const setSwitch = async (
  switchLocator: Locator,
  desired: boolean
): Promise<void> => {
  if ((await switchLocator.isChecked()) !== desired) {
    await switchLocator.click();
  }
};

const fillCalloutBaseFields = async (
  page: Page,
  dialog: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Callout title
  await dialog.getByRole('textbox', { name: 'Title' }).fill(templateData.calloutTitle);

  // Callout description (rich-text editor)
  if (templateData.calloutDescription) {
    await dialog
      .getByRole('textbox', { name: 'Write something...' })
      .fill(templateData.calloutDescription);
  }

  // Callout tags - one chip per Enter. Both the template and callout tag
  // inputs expose accessible name "Add a tag and press Enter"; the callout's
  // is the second in DOM order.
  if (templateData.calloutTags.length > 0) {
    const calloutTagsInput = dialog
      .getByRole('textbox', { name: 'Add a tag and press Enter' })
      .nth(1);
    for (const tag of templateData.calloutTags) {
      await calloutTagsInput.fill(tag);
      await calloutTagsInput.press('Enter');
    }
  }

  // Callout comments toggle
  await setSwitch(
    dialog.getByRole('switch', { name: 'Allow comments' }),
    templateData.commentsEnabled
  );

  // Callout references
  const references = templateData.calloutReferences ?? [];
  if (references.length > 0) {
    const referenceRows = dialog
      .getByRole('listitem')
      .filter({ has: dialog.getByRole('button', { name: 'Remove reference' }) });
    const existing = await referenceRows.count();
    for (let i = existing; i < references.length; i++) {
      await dialog
        .getByRole('button', { name: 'Add another reference' })
        .click();
    }
    for (let i = 0; i < references.length; i++) {
      const row = referenceRows.nth(i);
      await row.getByRole('textbox', { name: 'Name' }).fill(references[i].title);
      await row.getByRole('textbox', { name: 'URL' }).fill(references[i].url);
    }
  }
};

/**
 * Fills a Callout (collaboration tool) Template form with all fields.
 */
export const fillCalloutTemplateForm = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  const dialog = getCalloutTemplateDialog(page);

  // 1. Template metadata (displayName, description, tags)
  await fillTemplateForm(dialog, templateData);

  // 2. Callout base fields (title, description, tags, comments, references)
  await fillCalloutBaseFields(page, dialog, templateData);

  // 3. Framing ("Add to post" radiogroup)
  await selectAndFillCalloutTemplateFraming(page, dialog, templateData.framing);

  // 4. Response collection ("Responses" radiogroup + inline settings)
  await selectAndFillCalloutCollection(page, dialog, templateData.responseOptions);
};
