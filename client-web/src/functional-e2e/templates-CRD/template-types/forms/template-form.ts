import { Locator, Page } from '@playwright/test';
import { TemplateForm } from './template-form.models';

/**
 * Fills the common fields of a template create/edit dialog (name, description, tags).
 * Accepts the page or a Locator scoped to the dialog.
 */
export const fillTemplateForm = async (
  scope: Page | Locator,
  templateData: TemplateForm
) => {
  // Enter the template name
  await scope
    .getByRole('textbox', { name: 'Template name' })
    .fill(templateData.displayName);

  // Fill in the template description. The Description textbox is targeted by
  // its placeholder because reference rows (used by community-guidelines and
  // callout templates) also expose a textbox with accessible name "Description".
  await scope
    .getByPlaceholder('What is this template for?')
    .fill(templateData.description);

  // Fill the tags - type each tag and press Enter. Use `.first()` because the
  // callout create/edit dialog has a second "Add a tag and press Enter" textbox
  // for the callout's own tags; the template-level one is always first in DOM.
  const tagsInput = scope
    .getByRole('textbox', { name: 'Add a tag and press Enter' })
    .first();
  for (const tag of templateData.tags) {
    await tagsInput.fill(tag);
    await tagsInput.press('Enter');
  }
};
