import { Page, expect } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { WhiteboardTemplateForm } from './template-form.models';

const editWhiteboardCanvas = async (
  page: Page,
  textInWhiteboard: string
) => {
  const whiteboardContent = await page.getByText('Whiteboard TemplateDrawing');
  await whiteboardContent.getByRole('button', { name: 'Edit' }).click();

  const editorDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit Whiteboard Template' }),
  }).last();

  await expect(editorDialog).toBeVisible();

  await editorDialog
    //.getByRole('label', { name: /Text — T or/i })
    .locator('div').filter({ hasText: /^8$/ })
    .click();

  const canvas = await editorDialog.locator('canvas.excalidraw__canvas.interactive').first();
  await canvas.click();

  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(textInWhiteboard);
  await textInput.press('Escape');

  await editorDialog.getByRole('button', { name: 'Save' }).click();
};

export const fillWhiteboardTemplateForm = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await fillTemplateForm(page, templateData);
  await editWhiteboardCanvas(page, templateData.textInWhiteboard);
};
