import { Page } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { PostTemplateForm } from './template-form.models';
import { typeIntoRichTextEditor } from './rich-text';

export const fillPostTemplateForm = async (
  page: Page,
  templateData: PostTemplateForm
) => {
  await fillTemplateForm(page, templateData);

  // "Default description" — the content pre-filled for new posts. Tiptap
  // rich-text editor: must be typed, not `.fill()`ed (see typeIntoRichTextEditor).
  await typeIntoRichTextEditor(
    page.getByRole('textbox', {
      name: 'Content pre-filled for new posts using this template',
    }),
    templateData.defaultContent
  );
};
