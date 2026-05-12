import { expect, Page } from '@playwright/test';
import { PostTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';
import {
  closeTemplatePreview,
  getTemplatePreviewDialog,
} from './verify-opened-template';

export const verifyPostTemplate = async (
  page: Page,
  templateData: PostTemplateForm
) => {
  await verifyTemplate(page, templateData);

  // The preview dialog shows the "Default description" content
  const dialog = getTemplatePreviewDialog(page);
  await expect(dialog.getByText('Default description')).toBeVisible();
  await expect(
    dialog.getByText(templateData.defaultContent, { exact: true })
  ).toBeVisible();

  await closeTemplatePreview(page);
};
