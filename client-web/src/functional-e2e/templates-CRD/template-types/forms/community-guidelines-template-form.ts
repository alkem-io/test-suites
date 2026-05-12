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

  // References - each row has Name / URL / Description textboxes and a
  // "Remove reference" button. Add as many rows as needed, then fill them.
  const references = templateData.guidelines.references ?? [];
  const referenceRows = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: 'Remove reference' }) });

  const existingReferences = await referenceRows.count();
  for (let i = existingReferences; i < references.length; i++) {
    await page.getByRole('button', { name: 'Add reference' }).click();
  }

  for (let i = 0; i < references.length; i++) {
    const row = referenceRows.nth(i);
    await row.getByRole('textbox', { name: 'Name' }).fill(references[i].title);
    await row.getByRole('textbox', { name: 'URL' }).fill(references[i].url);
  }
};
