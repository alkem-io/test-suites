import { Page } from '@playwright/test';
import { fillTemplateForm } from './template-form';
import { WhiteboardTemplateForm } from './template-form.models';
import {
  closeWhiteboardEditor,
  getWhiteboardEditorDialog,
  openWhiteboardEditor,
  useTemplateInAWhiteboard,
  writeTextInWhiteboardDialog,
} from './whiteboards/whiteboard-dialog';

const editWhiteboardCanvas = async (page: Page, textInWhiteboard: string) => {
  await openWhiteboardEditor(page);

  const editorDialog = await getWhiteboardEditorDialog(page);

  await writeTextInWhiteboardDialog(editorDialog, textInWhiteboard);

  // The editor autosaves — closing it finalizes the drawing (no Save button).
  await closeWhiteboardEditor(editorDialog);
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
  templateData: WhiteboardTemplateForm
) => {
  await openWhiteboardEditor(page);

  const editorDialog = await getWhiteboardEditorDialog(page);

  await useTemplateInAWhiteboard(page, editorDialog, templateData.displayName);

  // The editor autosaves — closing it finalizes the drawing (no Save button).
  await closeWhiteboardEditor(editorDialog);
};
