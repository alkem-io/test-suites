import { Page } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { WhiteboardTemplateForm } from './template-form.models';
import { clickOnEditWhiteboardPreview, getWhiteboardDialog, useTemplateInAWhiteboard, writeTextInWhiteboardDialog } from './whiteboards/whiteboard-dialog';

const editWhiteboardCanvas = async (
  page: Page,
  textInWhiteboard: string
) => {
  await clickOnEditWhiteboardPreview(page);

  const editorDialog = await getWhiteboardDialog(page, 'Edit Whiteboard Template');

  await writeTextInWhiteboardDialog(editorDialog, textInWhiteboard);

  await editorDialog.getByRole('button', { name: 'Save' }).click();
};

export const fillWhiteboardTemplateForm = async (
  page: Page,
  templateData: WhiteboardTemplateForm
) => {
  await fillTemplateForm(page, templateData);
  await editWhiteboardCanvas(page, templateData.textInWhiteboard);
};

export const fillWhiteboardWithWhiteboardTemplate = async (
  page: Page,
  templateData: WhiteboardTemplateForm,
) => {
  await clickOnEditWhiteboardPreview(page);

  const editorDialog = await getWhiteboardDialog(page, 'Edit Whiteboard Template');

  await useTemplateInAWhiteboard(page, editorDialog, templateData.displayName);

  await editorDialog.getByRole('button', { name: 'Save' }).click();
};