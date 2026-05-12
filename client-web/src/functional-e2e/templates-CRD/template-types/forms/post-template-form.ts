import { Page } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { PostTemplateForm } from './template-form.models';

export const fillPostTemplateForm = async (
  page: Page,
  templateData: PostTemplateForm
) => {
  await fillTemplateForm(page, templateData);

  // "Default description" section - the content pre-filled for new posts
  await page
    .getByRole('textbox', {
      name: 'Content pre-filled for new posts using this template',
    })
    .fill(templateData.defaultContent);
};
