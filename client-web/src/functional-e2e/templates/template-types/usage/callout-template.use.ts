import { Locator, Page, expect } from "@playwright/test";
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

  // Verify the template content looks the same
  await verifyCalloutTemplate(page, templateData);

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
      // No framing content to verify
      break;
    }
  }

  await verifyCalloutContributions(page, calloutContainer, templateData);
}




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

      // Verify the Links & Files contribution button is present or not based on setting
      const addContributionButton = calloutContainer.getByRole('button', { name: 'Add' }).first();

      if (templateData.responseOptions.adminsCanAdd) {
        await expect(addContributionButton).toBeVisible();
        // Click on Add Link
        await addContributionButton.click();

        // Verify the Add Links or Documents dialog appears
        await expect(
          page.getByText(`Add links or documents to ${templateData.calloutTitle}`, { exact: true })
        ).toBeVisible();

        // Fill in the URL field
        await page.getByRole('textbox', { name: 'Title' }).fill(`${templateData.testId} Link test`);
        await page.getByRole('textbox', { name: 'URL' }).fill(`https://example.com/test-${templateData.testId}`);
        await page.getByRole('textbox', { name: 'Description' }).fill(`Link test description ${templateData.testId}`);

        // Click on save link
        await page.getByRole('button', { name: 'Save' }).click();

        // Verify the contribution appears in the callout
        await expect(
          calloutContainer.getByRole('link', { name: `${templateData.testId} Link test` }).first()
        ).toBeVisible();
      } else {
        // Contributions are disabled
        await expect(addContributionButton).not.toBeVisible();
      }
      break;
    }
    case 'posts':
    case 'memos':
    case 'whiteboards': {
      // TODO: Implement verification for other collection types
      break;
    }
    case 'none':
    default: {
// No contribution options to verify
      break;
    }
  }
}


const verifyContributionSettings = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Open the Callout Settings Menu
  const settingsMenu = calloutContainer.getByLabel('settings', { exact: true })
  await settingsMenu.click();

  // Open the Callout Settings Dialog
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const calloutDialog = page.getByRole('heading', { name: 'Edit Post' }).locator('..').locator('..').locator('..');

  // Expand the Response Options section
  const responseOptionsButton = calloutDialog.getByRole('button', { name: 'Expand' });
  await responseOptionsButton.scrollIntoViewIfNeeded()
  await responseOptionsButton.click();

  // Open Collection settings Dialog
  await calloutDialog.getByRole('button', { name: 'Collection settings' }).click();

  const collectionSettingsDialog = page.getByRole('heading', { name: 'Collection settings' }).locator('..').locator('..').locator('..');

  switch (templateData.responseOptions.type) {
    case 'linksFiles': {
      // Verify Admins can add contributions setting
      await expect(
        await collectionSettingsDialog.getByRole('checkbox', { name: 'Admins can add to the' }).isChecked()
      ).toBe(templateData.responseOptions.adminsCanAdd);

      // Verify Members can add contributions setting
      await expect(
        await collectionSettingsDialog.getByRole('checkbox', { name: 'Members can add to the' }).isChecked()
      ).toBe(templateData.responseOptions.membersCanAdd);
    }
    case 'posts': {
      //!! PENDING: Verify enableCommentsOnPosts
    }
    case 'memos': {
      //!!
    }
    case 'whiteboards': {
      //!!
    }
  }

  // Get back to Callout Edit Dialog
  await collectionSettingsDialog.getByRole('button', { name: 'Back' }).click();
  // Confirm
  await page.getByRole('button', { name: 'Yes, go back' }).click();

  // Cancel the Callout Edit Dialog
  await calloutDialog.getByRole('button', { name: 'Cancel' }).click();
}

//!! PENDING: Verify membersCanAdd

