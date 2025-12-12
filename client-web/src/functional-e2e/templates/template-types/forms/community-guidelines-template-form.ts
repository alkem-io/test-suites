import { Page } from "@playwright/test";
import { CommunityGuidelinesTemplateForm } from "./template-form.models";
import { clearAndEditTemplateForm, fillTemplateForm } from './template-form';


export const fillCommunityGuidelinesForm = async (page: Page, templateData: CommunityGuidelinesTemplateForm) => {
  // Fill the common template form fields
  await fillTemplateForm(page, templateData);

  // Enter the title for the community guidelines
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill(templateData.guidelines.displayName);

  // Fill in the guidelines content
  await page.getByRole('textbox', { name: 'Markdown editor' }).nth(1).fill(templateData.guidelines.description);

  //!! PENDING REFERENCES
}

export const clearAndEditCommunityGuidelinesForm = async (page: Page, templateData: CommunityGuidelinesTemplateForm) => {
  await clearAndEditTemplateForm(page, templateData);
  // Clear and edit the guidelines title
  const guidelinesTitleInput = page.getByRole('textbox', { name: 'Title', exact: true });
  await guidelinesTitleInput.clear();
  await guidelinesTitleInput.fill(templateData.guidelines.displayName);

  // Clear and edit the guidelines content
  const guidelinesContentInput = page.getByRole('textbox', { name: 'Markdown editor' }).nth(1);
  await guidelinesContentInput.clear();
  await guidelinesContentInput.fill(templateData.guidelines.description);

}