import { expect, Page } from '@playwright/test';
import { CommunityGuidelinesTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';
import {
  closeTemplatePreview,
  getTemplatePreviewDialog,
} from './verify-opened-template';

export const verifyCommunityGuidelinesTemplate = async (
  page: Page,
  templateData: CommunityGuidelinesTemplateForm
) => {
  await verifyTemplate(page, templateData);

  const dialog = getTemplatePreviewDialog(page);

  // Guidelines title and content
  await expect(
    dialog.getByText(templateData.guidelines.displayName, { exact: true })
  ).toBeVisible();
  await expect(
    dialog.getByText(templateData.guidelines.description, { exact: true })
  ).toBeVisible();

  // References are shown as links
  for (const reference of templateData.guidelines.references ?? []) {
    await expect(
      dialog.getByRole('link', { name: reference.title }).first()
    ).toBeVisible();
  }

  await closeTemplatePreview(page);
};
