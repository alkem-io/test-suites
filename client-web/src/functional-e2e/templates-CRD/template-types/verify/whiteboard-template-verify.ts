import { Page } from '@playwright/test';
import { WhiteboardTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';
import { closeTemplatePreview } from './verify-opened-template';

export const verifyWhiteboardTemplate = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await verifyTemplate(page, templateData);

  // TODO: Verify whiteboard content - it is rendered on a canvas, so there is
  // no straightforward way to assert on it. Leave this for now.

  await closeTemplatePreview(page);
};
