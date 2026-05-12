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

  // Fill in the template description
  await scope
    .getByRole('textbox', { name: 'Description' })
    .fill(templateData.description);

  // Fill the tags - type each tag and press Enter
  const tagsInput = scope.getByRole('textbox', {
    name: 'Add a tag and press Enter',
  });
  for (const tag of templateData.tags) {
    await tagsInput.fill(tag);
    await tagsInput.press('Enter');
  }
};
