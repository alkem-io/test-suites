import { expect } from '@playwright/test';
import { Page } from "@playwright/test";
import { TemplateForm } from "../forms/template-form.models";

export const verifyTemplate = async (page: Page, templateData: TemplateForm) => {
  // Verify the template is displayed in the list
  const card = await page.getByRole('heading', { name: templateData.displayName, exact: true }).first()
    .locator('..').locator('..').locator('..');

  await card.click();

  await expect(page.getByRole('heading', { name: templateData.displayName }).first()).toBeVisible();

  // Verify the template description is visible
  await expect(card.locator('.markdown')).toHaveText(templateData.description);

  await expect(page.getByText(templateData.description).first()).toBeVisible();
  // Verify the template tags are visible
  for (const tag of templateData.tags) {
    await expect(card.locator('.MuiChip-root').getByText(tag).first()).toBeVisible();
  }
}