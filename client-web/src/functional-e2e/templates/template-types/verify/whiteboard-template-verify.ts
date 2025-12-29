import { Page } from '@playwright/test';
import { WhiteboardTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';

export const verifyWhiteboardTemplate = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await verifyTemplate(page, templateData);

  // TODO: Verify whiteboard content
  // There's no straightforward way to verify the whiteboard content as it is rendered on a canvas. Leave this for now.
};
