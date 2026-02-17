import { expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';

export const verifyTemplate = async (page: Page, templateData: TemplateForm) => {
  // Verify the template is displayed in the list
  const card = await page.getByRole('heading', { name: templateData.displayName, exact: true }).first()
    .locator('..').locator('..').locator('..');

  await card.click();

  await expect(page.getByRole('heading', { name: templateData.displayName }).first()).toBeVisible();

  // Verify the template description is visible somewhere in the dialog
  // (don't check inside the card because whiteboard cards don't have the description)
  await expect(page.getByRole('heading', { name: `Preview — ${templateData.displayName}` })
    .locator('..').locator('..').locator('..').locator('.markdown').first())
    .toHaveText(templateData.description);

  // Verify at least a couple of tags
  const firstTwoTags = templateData.tags.slice(0, 2);
  for (const tag of firstTwoTags) {
    await expect(card.locator('.MuiChip-root').getByText(tag).first()).toBeVisible();
  }
}