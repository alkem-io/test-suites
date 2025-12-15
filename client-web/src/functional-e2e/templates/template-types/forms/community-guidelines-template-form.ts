import { Page } from "@playwright/test";
import { CommunityGuidelinesTemplateForm } from "./template-form.models";
import { fillTemplateForm } from './template-form';


export const fillCommunityGuidelinesForm = async (page: Page, templateData: CommunityGuidelinesTemplateForm) => {
  // Fill the common template form fields
  await fillTemplateForm(page, templateData);

  // Enter the title for the community guidelines
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(templateData.guidelines.displayName);

  // Fill in the guidelines content
  await page.getByRole('textbox', { name: 'Markdown editor' }).nth(1).fill(templateData.guidelines.description);

  //!! PENDING REFERENCES
}
