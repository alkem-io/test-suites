import { expect, Page } from '@playwright/test';
import { WhiteboardTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';
import {
  closeTemplatePreview,
  getTemplatePreviewDialog,
} from './verify-opened-template';

export const verifyWhiteboardTemplate = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await verifyTemplate(page, templateData);

  // Whiteboard-specific check. The drawing itself lives on a <canvas> and can't
  // be asserted, but the preview dialog renders the saved whiteboard as an
  // <img> thumbnail. Asserting it mounted guards against a blank/failed preview
  // render regressing silently (the shared verifyTemplate only checks the
  // name/description/tags, which are type-agnostic).
  const previewDialog = getTemplatePreviewDialog(page);
  await expect(previewDialog.locator('img').first()).toBeVisible();

  await closeTemplatePreview(page);
};
