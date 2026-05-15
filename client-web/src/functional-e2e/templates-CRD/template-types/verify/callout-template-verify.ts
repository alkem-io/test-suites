/**
 * Callout (Collaboration tool) Template verification.
 *
 * Verifies a Callout Template appears in the redesigned templates list and that
 * its preview dialog shows the expected metadata.
 *
 * NOTE: the framing-specific (whiteboard / memo / CTA) and reference checks of
 * the legacy UI are not yet ported to the redesigned preview dialog - see TODO.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';

export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  const previewButton = page.getByRole('button', {
    name: `Preview: ${templateData.displayName}`,
    exact: true,
  });
  await expect(previewButton).toBeVisible();

  // The card shows the first couple of tags
  const card = page.getByRole('listitem').filter({ has: previewButton }).last();
  for (const tag of templateData.tags.slice(0, 2)) {
    await expect(card.getByText(tag, { exact: true }).first()).toBeVisible();
  }

  // Open the preview dialog and verify the template + callout titles
  await previewButton.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: templateData.displayName })
  ).toBeVisible();
  await expect(dialog.getByText(templateData.calloutTitle).first()).toBeVisible();

  // TODO: verify framing-specific content (whiteboard / memo / call-to-action),
  // response configuration and references in the redesigned preview dialog.

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();
};

/**
 * Verifies that a Callout Template card is visible in the templates list.
 */
export const verifyCalloutTemplateInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true }).first()
  ).toBeVisible();
};

/**
 * Verifies that a Callout Template card is NOT visible in the templates list.
 */
export const verifyCalloutTemplateNotInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true })
  ).not.toBeVisible();
};
