import { Locator, Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../forms/callout/callout-template-form.models";
import { verifyCalloutTemplate } from "../verify/callout-template-verify";
import { verifyCalloutContributionLinks } from "./contributions/callout-template.use.links";
import { verifyCalloutContributionPosts } from "./contributions/callout-template.use.posts";
import { verifyContributionSettings } from "./contributions/callout-template.use.contributions";
import { verifyCalloutContributionMemos } from "./contributions/callout-template.use.memos";
import { verifyCalloutContributionWhiteboards } from "./contributions/callout-template.use.whiteboards";



export const verifyCalloutTemplateUsage = async (
  page: Page,
  url: string,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Navigate to the provided URL where the template will be used
  await page.goto(url);

  // Click the Add Callout button
  await page.getByRole('button', { name: 'Post' }).first().click();

  // Find the the Add Callout dialog
  const addPostDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Add Post' }),
  }).last();

  // Click the Find Template button
  await addPostDialog.getByRole('button', { name: 'Find Template' }).first().click();

  // Select the template in the list
  await page.getByRole('heading', { name: templateData.displayName, exact: true }).click();

  // Wait for the template to be loaded - verify callout title appears
  await expect(page.getByText(templateData.calloutTitle, { exact: false }).first()).toBeVisible();

  // Verify the template content looks the same
  await verifyCalloutTemplate(page, templateData);

  // Click the Use Template button
  await page.getByRole('button', { name: 'Use', exact: true }).click();

  // Click the Post button to add the callout
  await addPostDialog.getByRole('button', { name: 'Post', exact: true }).click();

  // Wait for the dialog to close
  await addPostDialog.waitFor({ state: 'hidden' });



  // Verify the callout appears in the feed with correct title and description
  const title = await page.getByRole('heading', { name: templateData.calloutTitle, exact: true });
  await title.scrollIntoViewIfNeeded();
  await expect(title).toBeVisible();
  const calloutContainer = title.locator('..').locator('..').locator('..').locator('..');

  await expect(
    calloutContainer
      .getByText(templateData.calloutDescription, { exact: true })
  ).toBeVisible();


  if (templateData.commentsEnabled) {
    // Verify the comments section is present
    await expect(
      calloutContainer.getByRole('textbox', { name: 'Type your comment here' }).first()
    ).toBeVisible();
  } else {
    await expect(
      calloutContainer.getByRole('textbox', { name: 'Type your comment here' }).first()
    ).not.toBeVisible();
  }

  // Verify Framing:
  switch (templateData.framing.type) {
    case 'whiteboard': {
      // Verify whiteboard canvas is present (check for drawing canvas or text)
      await expect(
        calloutContainer.getByRole('button', { name: 'Click to open whiteboard' })
      ).toBeDefined(); // Don't use toBeVisible because it's only visible on hover
      break;
    }
    case 'memo': {
      // Verify memo content is visible
      await expect(
        calloutContainer.getByText(templateData.framing.memoContent, { exact: true }).first()
      ).toBeVisible();
      break;
    }
    case 'callToAction': {
      // Verify CTA is visible - it appears as a button in the feed
      await expect(
        calloutContainer.getByRole('button', { name: templateData.framing.ctaText }).first()
      ).toBeVisible();
      break;
    }
    case 'none':
    default: {
      // No framing content to verify
      break;
    }
  }

  await verifyCalloutContributions(page, calloutContainer, templateData);
}


/**
 * Verify the contribution settings dialog in the Callout created using the template
 */
const verifyCalloutContributions = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Check that the contribution settings are the same
  // Verify Response Options based on type
  switch (templateData.responseOptions.type) {
    case 'linksFiles': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionLinks(page, calloutContainer, templateData);
      break;
    }
    case 'posts': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionPosts(page, calloutContainer, templateData);
      break;
    }
    case 'memos': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionMemos(page, calloutContainer, templateData);
      break;
    }
    case 'whiteboards': {
      await verifyContributionSettings(page, calloutContainer, templateData);
      await verifyCalloutContributionWhiteboards(page, calloutContainer, templateData);
      break;
    }
    case 'none':
    default: {
      // No contribution options to verify
      break;
    }
  }
}

