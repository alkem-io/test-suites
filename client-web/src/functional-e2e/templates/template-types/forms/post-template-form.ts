import { Page } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { PostTemplateForm } from './template-form.models';

export const fillPostTemplateForm = async (page: Page, templateData: PostTemplateForm) => {
  await fillTemplateForm(page, templateData);

  const postContentInput = page.getByRole('textbox', { name: 'Markdown editor' }).nth(1);
  await postContentInput.fill(templateData.defaultContent);
};
