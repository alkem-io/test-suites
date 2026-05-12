import { expect, Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';
import { verifyOpenedTemplate } from './verify-opened-template';

/**
 * Verifies a template appears in the templates list with the expected name,
 * description and tags, then opens its preview dialog and checks the name and
 * description there too.
 *
 * Leaves the preview dialog OPEN so type-specific verifiers can check
 * additional fields. Callers should close it (e.g. via `closeTemplatePreview`).
 */
export const verifyTemplate = async (page: Page, templateData: TemplateForm) => {
  // The template card carries a "Preview: <name>" button
  const previewButton = page.getByRole('button', {
    name: `Preview: ${templateData.displayName}`,
    exact: true,
  });
  await expect(previewButton).toBeVisible();

  // Locate the template card (innermost list item containing the preview button)
  const templateCard = page
    .getByRole('listitem')
    .filter({ has: previewButton })
    .last();

  // Description and the first couple of tags are shown on the card
  await expect(
    templateCard.getByText(templateData.description, { exact: true })
  ).toBeVisible();
  for (const tag of templateData.tags.slice(0, 2)) {
    await expect(templateCard.getByText(tag, { exact: true }).first()).toBeVisible();
  }

  // Open the preview dialog and verify name + description there
  await previewButton.click();
  await verifyOpenedTemplate(page, templateData);
};
