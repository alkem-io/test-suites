import { Page } from "@playwright/test";
import { TemplateForm } from "./template-form.models";


export const fillTemplateForm = async (page: Page, templateData: TemplateForm) => {
  // Enter the template title in the Template description section
  await page.getByRole('textbox', { name: 'Template title' }).fill(templateData.displayName);

  // Fill in the template description
  await page.getByRole('textbox', { name: 'Markdown editor' }).first().fill(templateData.description);

  // Fill the tags
  await page.getByRole('combobox', { name: 'Template tags' }).click();
  for (const tag of templateData.tags) {
    await page.getByRole('combobox', { name: 'Template tags' }).fill(tag);
    await page.getByRole('combobox', { name: 'Template tags' }).press('Enter');
  }
}

