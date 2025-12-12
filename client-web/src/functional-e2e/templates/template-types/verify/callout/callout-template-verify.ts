/**
 * Callout Template Verification
 *
 * Verifies that a Callout Template was created/updated correctly.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { verifyTemplate } from '../template-verify';

/**
 * Verifies a Callout Template in the preview/list view.
 */
export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Verify base template fields (displayName, description, tags)
  await verifyTemplate(page, templateData);

  // Verify callout title is visible
  await expect(page.getByText(templateData.calloutTitle, { exact: false }).first()).toBeVisible();

  // Verify additional content based on type
  switch (templateData.additionalContent.type) {
    case 'whiteboard':
      // Verify whiteboard canvas is present (check for drawing canvas or text)
      await expect(
        page.getByText(templateData.additionalContent.textInWhiteboard, { exact: false }).first()
      ).toBeVisible();
      break;
    case 'memo':
      // Verify memo content is visible
      await expect(
        page.getByText(templateData.additionalContent.memoContent, { exact: false }).first()
      ).toBeVisible();
      break;
    case 'callToAction':
      // Verify CTA text is visible
      await expect(
        page.getByText(templateData.additionalContent.ctaText, { exact: false }).first()
      ).toBeVisible();
      break;
    case 'none':
      // No additional content to verify
      break;
  }
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
