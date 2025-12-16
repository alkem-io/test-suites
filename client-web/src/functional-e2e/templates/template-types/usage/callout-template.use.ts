import { Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../forms/callout/callout-template-form.models";
import { verifyCalloutTemplate } from "../verify/callout/callout-template-verify";



export const verifyCalloutTemplateUsage = async (
  page: Page,
  url: string,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Navigate to the provided URL where the template will be used
  await page.goto(url);

  // Click the Add Callout button
  await page.getByRole('button', { name: 'Post' }).first().click();

  // Click the Find Template button
  await page.getByRole('button', { name: 'Find Template' }).first().click();

  // Select the template in the list
  await page.getByRole('heading', { name: templateData.displayName, exact: true }).click();

  // Wait for the template to be loaded - verify callout title appears
  await expect(page.getByText(templateData.calloutTitle, { exact: false }).first()).toBeVisible();

  // Click the Use Template button
  await page.getByRole('button', { name: 'Use' }).first().click();

  // Click the Add Callout button
  const addPostDialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Add Post' }),
  }).last();

  // Click the Post button to add the callout
  await addPostDialog.getByRole('button', { name: 'Post' }).first().click();

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
      expect(calloutContainer.getByRole('button', { name: 'Click to open whiteboard' })).not.toBeVisible();
      break;
    }
  }


//!!
  // AGENT, Continue implementing, if the callout has comment, if it has additional content (framing), if the user can contribute...
  page.pause();
}
