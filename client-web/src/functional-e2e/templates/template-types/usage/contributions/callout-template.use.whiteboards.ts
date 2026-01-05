import { Locator, Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../../forms/callout/callout-template-form.models";
import { getCreateContributionDialog } from "./callout-template.use.contributions";

export const verifyCalloutContributionWhiteboards = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {

  // Verify the Wb contribution button is present or not based on setting
  const addContributionButton = calloutContainer.getByRole('button', { name: 'Add' }).first();
  if (templateData.responseOptions.type !== 'whiteboards') {
    throw new Error(`Contribution type mismatch: expected whiteboards but got ${templateData.responseOptions.type}`);
  }

  if (templateData.responseOptions.adminsCanAdd) {
    await expect(addContributionButton).toBeVisible();
    // Click on Add Whiteboard
    await addContributionButton.click();

    // Find the opened dialog
    const dialog = await getCreateContributionDialog(page, templateData);

    // Verify the Title field is present
    await expect(
      dialog.getByRole('textbox', { name: 'Title' })
    ).toHaveValue(templateData.responseOptions.defaultTitle);

    // Click on save
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Verify the url has changed to include the new post
    await expect(page).toHaveURL(new RegExp(`/whiteboards/`));

    // Verify the contribution appears in the callout
    await expect(
      page.getByRole('heading', { name: templateData.responseOptions.defaultTitle })
    ).toBeVisible();

  } else {
    // Contributions are disabled
    await expect(addContributionButton).not.toBeVisible();
  }
}