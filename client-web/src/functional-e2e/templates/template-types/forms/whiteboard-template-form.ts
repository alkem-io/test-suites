import { Page, expect } from '@playwright/test';
import { clearAndEditTemplateForm, fillTemplateForm } from './template-form';
import { WhiteboardTemplateForm } from './template-form.models';

const getWhiteboardEditorDialog = (page: Page) =>
  page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Edit Whiteboard Template' }),
  });

const editWhiteboardCanvas = async (
  page: Page,
  textInWhiteboard: string
) => {
  await page.getByRole('button', { name: 'Edit' }).click();
  const editorDialog = getWhiteboardEditorDialog(page);
  await expect(editorDialog).toBeVisible();

/*  // Use force click as the radio input is visually covered by an icon
  await editorDialog
    .getByRole('radio', { name: 'Text' })
    .click({ force: true });

  // Click on the interactive canvas (there are two canvases - static and interactive)
    const canvas = editorDialog.locator('canvas.excalidraw__canvas.interactive');
  */

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
  await expect(editorDialog).not.toBeVisible();
};

export const fillWhiteboardTemplateForm = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await fillTemplateForm(page, templateData);
  await editWhiteboardCanvas(page, templateData.textInWhiteboard);
};

export const clearAndEditWhiteboardTemplateForm = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await clearAndEditTemplateForm(page, templateData);
  await editWhiteboardCanvas(page, templateData.textInWhiteboard);
};
