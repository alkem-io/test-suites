import { expect, Page } from '@playwright/test';
import { PostTemplateForm } from '../forms/template-form.models';
import { verifyTemplate } from './template-verify';

export const verifyPostTemplate = async (page: Page, templateData: PostTemplateForm) => {
  await verifyTemplate(page, templateData);

  await expect(
    page
      .locator('.markdown')
      .filter({ hasText: templateData.defaultContent })
      .first()
  ).toBeVisible();
};
