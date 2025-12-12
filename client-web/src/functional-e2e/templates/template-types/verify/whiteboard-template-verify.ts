import { expect, Page } from '@playwright/test';
import { WhiteboardTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';

export const verifyWhiteboardTemplate = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await verifyTemplate(page, templateData);

  await expect(
    page.getByText(templateData.textInWhiteboard, { exact: false }).first()
  ).toBeVisible();
};
