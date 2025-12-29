import { Locator, Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../../forms/callout/callout-template-form.models";

export const getCreateContributionDialog = async (page: Page, templateData: CalloutTemplateForm): Promise<Locator> => {
  let dialogTitle = '';
  switch (templateData.responseOptions.type) {
    case 'linksFiles': {
      dialogTitle = `Add links or documents to ${templateData.calloutTitle}`;
      break;
    }
    case 'posts': {
      dialogTitle = `Submit your answer to ${templateData.calloutTitle}`;
      break;
    }
    case 'memos': {
      dialogTitle = 'Create new memo';
      break;
    }
    case 'whiteboards': {
      dialogTitle = 'Create new whiteboard';
      break;
    }
    default: {
      throw new Error(`Unsupported contribution type: ${templateData.responseOptions.type}`);
    }
  }

  const dialogTitleLocator = page.getByText(dialogTitle, { exact: true });
  await expect(
    dialogTitleLocator
  ).toBeVisible();
  const dialog = dialogTitleLocator.locator('..').locator('..').locator('..').locator('..');
  return dialog;
}


/**
 * Verify the contribution settings dialog in the Callout created using the template
 * //!! PENDING: Verify membersCanAdd
 */
export const verifyContributionSettings = async (
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

  // If type is none, just exit, nothing to verify
  if (templateData.responseOptions.type !== 'none') {

    // Verify Admins can add contributions setting
    await expect(
      await collectionSettingsDialog.getByRole('checkbox', { name: 'Admins can add to the' }).isChecked()
    ).toBe(templateData.responseOptions.adminsCanAdd);

    // Verify Members can add contributions setting
    await expect(
      await collectionSettingsDialog.getByRole('checkbox', { name: 'Members can add to the' }).isChecked()
    ).toBe(templateData.responseOptions.membersCanAdd);

  }

  // Verify the rest of the specific settings based on collection type
  switch (templateData.responseOptions.type) {
    case 'posts': {
      // Verify Comments on Posts setting
      await expect(
        await collectionSettingsDialog.getByRole('checkbox', { name: 'Enable comments on each Post' }).isChecked()
      ).toBe(templateData.responseOptions.enableCommentsOnPosts);

      // Verify the Title:
      await expect(
        await collectionSettingsDialog.getByRole('textbox', { name: 'Title' }).inputValue()
      ).toBe(templateData.responseOptions.defaultTitle);

      // Verify the Description:
      await expect(
        collectionSettingsDialog.getByText(templateData.responseOptions.defaultDescription, { exact: true })
      ).toBeVisible();
      break;
    }
    case 'memos': {
      // Verify the Title:
      await expect(
        await collectionSettingsDialog.getByRole('textbox', { name: 'Title' }).inputValue()
      ).toBe(templateData.responseOptions.defaultTitle);

      // Verify the Description:
      //!! WARNING, THIS IS A BUG, UNCOMMENT WHEN FIXED
      // await expect(
      //   collectionSettingsDialog.getByText(templateData.responseOptions.defaultDescription, { exact: true })
      // ).toBeVisible();
      break;
    }
    case 'whiteboards': {
      // Verify the Title:
      await expect(
        await collectionSettingsDialog.getByRole('textbox', { name: 'Title' }).inputValue()
      ).toBe(templateData.responseOptions.defaultTitle);
    }
    case 'linksFiles': {
      break;
    }
  }

  // Get back to Callout Edit Dialog

  const backButton = collectionSettingsDialog.getByRole('button', { name: 'Back' }).last();
  await backButton.scrollIntoViewIfNeeded();
  await backButton.click();

  // Confirm if dialog appears (only shows if changes were made)
  const confirmButton = page.getByRole('button', { name: 'Yes, go back' });
  if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmButton.click();
  }

  // Cancel the Callout Edit Dialog
  await calloutDialog.getByRole('button', { name: 'Cancel' }).click();
}
