import { expect } from '@playwright/test';
import { Page } from '@playwright/test';
import { TemplateForm } from '../forms/template-form.models';

export const verifyOpenedTemplate = async (
  page: Page,
  templateData: TemplateForm
) => {
  // Verify the template is displayed in the list
  await expect(page.locator('#preview-template-dialog')).toHaveText(
    `Preview — ${templateData.displayName}`
  );

  await expect(
    page.getByRole('heading', { name: templateData.displayName, exact: true })
  ).toHaveText(templateData.displayName);

  // Verify at least a couple of tags
  const firstTwoTags = templateData.tags.slice(0, 2);
  for (const tag of firstTwoTags) {
    await expect(
      page.locator('.MuiChip-root').getByText(tag).first()
    ).toBeVisible();
  }
};
