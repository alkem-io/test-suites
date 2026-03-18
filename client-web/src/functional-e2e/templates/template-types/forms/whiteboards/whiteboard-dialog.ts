import { Locator, Page, expect } from '@playwright/test';

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
  // Click the text tool (represented by "8" in the Excalidraw toolbar)
  await editorDialog
    .locator('div').filter({ hasText: /^8$/ })
    .click();

  const canvas = await editorDialog.locator('canvas.excalidraw__canvas.interactive').first();
  await canvas.click();

  const textInput = editorDialog.getByRole('textbox');
  await textInput.fill(text);
  await textInput.press('Escape');
}

export const useTemplateInAWhiteboard = async (
  page: Page,
  whiteboardDialog: Locator,
  templateName: string
) => {
  await whiteboardDialog.getByRole('button', { name: 'Find Template' }).click();

  await page.getByRole('heading', { name: templateName, exact: true }).click();

  const templateDialog = await page.getByRole('heading', { name: 'Preview — Test Whiteboard' }).locator('..').locator('..').locator('..');
  await expect(templateDialog.getByRole('heading', { name: templateName, exact: true })).toBeVisible();
  await templateDialog.getByRole('heading', { name: templateName, exact: true }).click();
  await templateDialog.getByRole('button', { name: 'Use' }).click();

  await expect(templateDialog).not.toBeVisible();


};