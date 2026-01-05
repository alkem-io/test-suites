import { Page } from "@playwright/test";
import { CommunityGuidelinesTemplateForm } from "./template-form.models";
import { fillTemplateForm } from './template-form';


export const fillCommunityGuidelinesForm = async (page: Page, templateData: CommunityGuidelinesTemplateForm) => {
  // Fill the common template form fields
  await fillTemplateForm(page, templateData);

  // Enter the title for the community guidelines
  await page.getByRole('textbox', { name: 'Title', exact: true }).first().fill(templateData.guidelines.displayName);

  // Fill in the guidelines content
  await page.getByRole('textbox', { name: 'Markdown editor' }).nth(1).fill(templateData.guidelines.description);

  const numberOfReferences = templateData.guidelines.references?.length ?? 0;
  const existingReferences = await page.locator('input[name^="communityGuidelines.profile.references"]').count() / 2;


  for (let i = 0; i < numberOfReferences - existingReferences; i++) {
    await page.getByRole('button', { name: 'Add Reference' }).click();
  }

  for (let i = 0; i < numberOfReferences; i++) {
    const reference = templateData.guidelines.references![i];
    await page.locator(`input[name="communityGuidelines.profile.references.${i}.name"]`).fill(reference.title);
    await page.locator(`input[name="communityGuidelines.profile.references.${i}.uri"]`).fill(reference.url);
  }
}
