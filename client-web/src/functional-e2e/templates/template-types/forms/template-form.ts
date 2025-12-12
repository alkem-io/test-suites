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

export const clearAndEditTemplateForm = async (page: Page, templateData: TemplateForm) => {
  // Clear and edit the template title
  const titleInput = page.getByRole('textbox', { name: 'Template title' });
  await titleInput.clear();
  await titleInput.fill(templateData.displayName);

  // Clear and edit the template description
  const descriptionInput = page.getByRole('textbox', { name: 'Markdown editor' }).first();
  await descriptionInput.clear();
  await descriptionInput.fill(templateData.description);

  // Add a new tag (the last one in the array)
  await page.getByRole('combobox', { name: 'Template tags' }).fill(templateData.tags[templateData.tags.length - 1]);
}