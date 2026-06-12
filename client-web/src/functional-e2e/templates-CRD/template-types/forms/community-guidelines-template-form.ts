import { Page } from '@playwright/test';
import { CommunityGuidelinesTemplateForm } from './template-form.models';
import { fillTemplateForm } from './template-form';

export const fillCommunityGuidelinesForm = async (
  page: Page,
  templateData: CommunityGuidelinesTemplateForm
) => {
  // Fill the common template form fields
  await fillTemplateForm(page, templateData);

  // Guidelines title
  await page
    .getByRole('textbox', { name: 'Guidelines title' })
    .fill(templateData.guidelines.displayName);

  // Guidelines content (rich-text editor)
  await page
    .getByRole('textbox', { name: 'Write the guidelines for this community…' })
    .fill(templateData.guidelines.description);

  // References - each row has Title / URL / Description textboxes and a
  // "Remove reference" button. Add as many rows as needed, then fill them.
  // The rows render as plain containers (no list/listitem roles), so we count
  // the per-row "Remove reference" buttons and address the Title/URL textboxes
  // positionally. `exact: true` keeps the "Title" match from also picking up
  // the "Guidelines title" field above.
  const references = templateData.guidelines.references ?? [];
  const existingReferences = await page
    .getByRole('button', { name: 'Remove reference' })
    .count();
  for (let i = existingReferences; i < references.length; i++) {
    await page.getByRole('button', { name: 'Add another reference' }).click();
  }

  const titleBoxes = page.getByRole('textbox', { name: 'Title', exact: true });
  const urlBoxes = page.getByRole('textbox', { name: 'URL', exact: true });
  for (let i = 0; i < references.length; i++) {
    await titleBoxes.nth(i).fill(references[i].title);
    await urlBoxes.nth(i).fill(references[i].url);
  }
};
