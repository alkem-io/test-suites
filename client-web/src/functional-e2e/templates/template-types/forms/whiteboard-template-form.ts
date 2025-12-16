import { Page, expect } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { WhiteboardTemplateForm } from './template-form.models';
import { clickOnEditWhiteboardPreview, getWhiteboardDialog, writeTextInWhiteboardDialog } from './whiteboards/whiteboard-dialog';

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
