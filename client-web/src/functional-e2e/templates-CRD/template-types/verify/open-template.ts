import { expect, Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';
import { getTemplatePreviewDialog } from './verify-opened-template';

/**
 * Opens a template's preview dialog from the templates list by clicking its
 * "Preview: <name>" card button.
 */
export const openTemplate = async (page: Page, templateData: TemplateForm) => {
  await page
    .getByRole('button', {
      name: `Preview: ${templateData.displayName}`,
      exact: true,
    })
    .click();

  await expect(
    getTemplatePreviewDialog(page).getByRole('heading', {
      name: templateData.displayName,
    })
  ).toBeVisible();
};

/**
 * Alias kept for callers that distinguished whiteboard templates - the
 * templates list is uniform now, so this just opens the preview dialog.
 */
export const openWhiteboardTemplate = openTemplate;
