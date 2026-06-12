import { expect, Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';

/**
 * Returns the template preview dialog (the one with the "Edit template" button).
 */
export const getTemplatePreviewDialog = (page: Page) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });

/**
 * Closes the template preview dialog (if open).
 */
export const closeTemplatePreview = async (page: Page) => {
  const dialog = getTemplatePreviewDialog(page);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();
};

/**
 * Verifies the currently open template preview dialog shows the expected
 * template name and description.
 */
export const verifyOpenedTemplate = async (
  page: Page,
  templateData: TemplateForm
) => {
  const dialog = getTemplatePreviewDialog(page);
  await expect(dialog).toBeVisible();

  // The dialog heading combines the template name with the section name
  await expect(
    dialog.getByRole('heading', { name: templateData.displayName })
  ).toBeVisible();

  await expect(
    dialog.getByText(templateData.description, { exact: true })
  ).toBeVisible();
};
