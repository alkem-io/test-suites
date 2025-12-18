import { Locator, Page, expect } from "@playwright/test";

export const clickOnEditWhiteboardPreview = async (page: Page): Promise<void> => {
  const whiteboardContent = await page.getByText('Drawing canvas').last();
  await expect(whiteboardContent).toBeVisible();
  await whiteboardContent.locator('..').locator('..').locator('..')
    .getByRole('button', { name: 'Edit' }).click();
}

export const getWhiteboardDialog = async (page: Page, title: string) => {
  const dialog = await page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: title }),
  }).last();
  await expect(dialog).toBeVisible();

  return dialog;
}

export const writeTextInWhiteboardDialog = async (
  editorDialog: Locator,
  text: string
): Promise<void> => {
  await editorDialog
    .locator('div').filter({ hasText: /^8$/ })
    .click();

  const canvas = await editorDialog.locator('canvas.excalidraw__canvas.interactive').first();
  await canvas.click();

  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(text);
  await textInput.press('Escape');
}
