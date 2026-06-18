import { Locator, Page, expect } from '@playwright/test';

/**
 * Opens the whiteboard (Excalidraw) editor from a template create/edit dialog.
 * The button is "Start drawing" when the template has no drawing yet,
 * or "Edit drawing" once a drawing exists.
 */
export const openWhiteboardEditor = async (page: Page): Promise<void> => {
  const startDrawing = page.getByRole('button', { name: 'Start drawing' });
  if (await startDrawing.isVisible().catch(() => false)) {
    await startDrawing.click();
  } else {
    await page.getByRole('button', { name: 'Edit drawing' }).click();
  }
};

/**
 * Returns the whiteboard editor dialog (the one hosting the Excalidraw canvas).
 */
export const getWhiteboardEditorDialog = async (page: Page): Promise<Locator> => {
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByText('Drawing canvas') })
    .last();
  await expect(dialog).toBeVisible();

  return dialog;
};

/**
 * Writes a text element on the whiteboard canvas.
 * Does NOT commit/close the editor - the caller is expected to click the
 * editor's "Save" button afterwards (pressing Escape triggers a
 * "discard unsaved changes" confirmation dialog).
 */
export const writeTextInWhiteboardDialog = async (
  editorDialog: Locator,
  text: string
): Promise<void> => {
  // Select the Text tool in the Excalidraw toolbar. The toolbar buttons are
  // <label title="Text — T or 8"> wrappers around a visually-hidden radio
  // input - clicking the input does nothing, so target the label by title.
  await editorDialog.getByTitle(/^Text —/).click();

  // Click on the canvas to place the text cursor
  await editorDialog
    .locator('canvas.excalidraw__canvas.interactive')
    .first()
    .click();

  // Type the text into the inline editor
  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(text);
};

/**
 * @deprecated Use {@link openWhiteboardEditor} instead.
 */
export const clickOnEditWhiteboardPreview = openWhiteboardEditor;

/**
 * @deprecated Use {@link getWhiteboardEditorDialog} instead. The `title`
 * argument is ignored - the editor dialog is identified by its canvas.
 */
export const getWhiteboardDialog = async (
  page: Page,
  _title?: string
): Promise<Locator> => getWhiteboardEditorDialog(page);

export const useTemplateInAWhiteboard = async (
  page: Page,
  whiteboardDialog: Locator,
  templateName: string
) => {
  await whiteboardDialog.getByRole('button', { name: 'Find Template' }).click();

  // The "Use a template" picker lists templates as list items, each showing the
  // template name and a "Use template" button.
  const pickerDialog = page.getByRole('dialog', { name: 'Use a template' });
  await expect(pickerDialog).toBeVisible();

  // Match on an exact-text element rather than `hasText` (substring), so
  // "Template A" can't accidentally select "Template A Extended".
  const item = pickerDialog
    .getByRole('listitem')
    .filter({ has: page.getByText(templateName, { exact: true }) });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Use template', exact: true }).click();

  await expect(pickerDialog).not.toBeVisible();
};
