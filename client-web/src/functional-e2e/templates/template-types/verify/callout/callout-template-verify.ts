/**
 * Callout Template Verification
 *
 * Verifies that a Callout Template was created/updated correctly.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';

/**
 * Verifies a Callout Template in the preview/list view.
 * For detailed content verification (like CTA, memo, whiteboard), clicks to open detail view.
 */
export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Click on the template to open the detail view
  await page.getByRole('heading', { name: templateData.displayName, exact: true }).first().click();

  // Wait for detail view to load - verify callout title is visible
  await expect(page.getByText(templateData.calloutTitle, { exact: false }).first()).toBeVisible();

  // Verify additional content based on type
  switch (templateData.framing.type) {
    case 'whiteboard':
      // Verify whiteboard canvas is present (check for drawing canvas or text)
      await expect(
        page.getByRole('img', { name: templateData.calloutTitle, exact: true })
      ).toBeVisible();
      break;
    case 'memo':
      // Verify memo content is visible
      await expect(
        page.getByText(templateData.framing.memoContent, { exact: false }).first()
      ).toBeVisible();
      break;
    case 'callToAction':
      // CTA content is not visible in the preview dialog
      // The CTA text/URL are stored but shown when the callout is actually used
      // Just verify the callToAction tag is present
      await expect(page.locator('.MuiChip-root').getByText('callToAction').first()).toBeVisible();
      break;
    case 'none':
      // No additional content to verify
      break;
  }

  await expect(
    page
      .locator('.markdown')
      .filter({ hasText: templateData.calloutDescription })
      .first()
  ).toBeVisible();

  for (const tag of templateData.calloutTags) {
    await expect(page.locator('.MuiChip-root').getByText(tag).first()).toBeVisible();
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
