import { expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';

export const openTemplate = async (page: Page, templateData: TemplateForm) => {
  const card = await page.getByRole('link', { name: 'Contribute' });

  await card.click({ timeout: 5000 });

  await expect(
    page.getByRole('heading', { name: templateData.displayName, exact: true })
  ).toBeVisible();
};

export const openWhiteboardTemplate = async (
  page: Page,
  templateData: TemplateForm
) => {
  const card = await page
    .locator('a')
    .filter({ hasText: templateData.displayName })
    .first();

  await card.click({ timeout: 5000 });

  await expect(
    page.getByRole('heading', { name: templateData.displayName, exact: true })
  ).toBeVisible();
};
