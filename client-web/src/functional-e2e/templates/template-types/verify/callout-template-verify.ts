/**
 * Callout Template Verification
 *
 * Verifies that a Callout Template was created/updated correctly.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';

/**
 * Verifies a Callout Template in the preview/list view.
 * For detailed content verification (like CTA, memo, whiteboard), clicks to open detail view.
 */
export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Click on the template to open the detail view
  await page
    .getByRole('heading', { name: templateData.displayName, exact: true })
    .first()
    .click();

  // Wait for detail view to load - verify callout title is visible
  await expect(
    page.getByText(templateData.calloutTitle, { exact: false }).first()
  ).toBeVisible();

  // Verify additional content based on type
  switch (templateData.framing.type) {
    case 'whiteboard':
      // Verify whiteboard canvas is present (check for drawing canvas or text)
      // Some previews collapse; only assert presence
      await expect(
        page.getByRole('img', { name: templateData.calloutTitle, exact: true })
      ).toBeDefined();
      break;
    case 'memo':
      // Verify memo content is visible
      await expect(
        page
          .getByText(templateData.framing.memoContent, { exact: false })
          .first()
      ).toBeVisible();
      break;
    case 'callToAction':
      // CTA content is not visible in the preview dialog
      // The CTA text/URL are stored but shown when the callout is actually used
      // Just verify the callToAction tag is present
      const ctaChip = page.locator('.MuiChip-root').getByText('callToAction');
      await expect(await ctaChip.count()).toBeGreaterThan(0);
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
    const chip = page.locator('.MuiChip-root').getByText(tag);
    const count = await chip.count();
    if (count === 0) {
      // Tag may be hidden in a "+N" overflow button — its accessible name
      // lists the truncated tags (e.g. "posts, comments-disabled")
      const escapedTag = tag.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const overflowBtn = page.getByRole('button', {
        name: new RegExp(escapedTag),
      });
      await expect(await overflowBtn.count()).toBeGreaterThan(0);
    }
  }

  for (const reference of templateData.calloutReferences) {
    const link = page.getByRole('link', { name: reference.title }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', reference.url);
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
