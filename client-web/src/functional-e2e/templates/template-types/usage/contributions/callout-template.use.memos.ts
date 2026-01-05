import { Locator, Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../../forms/callout/callout-template-form.models";
import { getCreateContributionDialog } from "./callout-template.use.contributions";

export const verifyCalloutContributionMemos = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {

  // Verify the Memo contribution button is present or not based on setting
  const addContributionButton = calloutContainer.getByRole('button', { name: 'Add' }).first();
  if (templateData.responseOptions.type !== 'memos') {
    throw new Error(`Contribution type mismatch: expected memos but got ${templateData.responseOptions.type}`);
  }

  if (templateData.responseOptions.adminsCanAdd) {
    await expect(addContributionButton).toBeVisible();
    // Click on Add Memo
    await addContributionButton.click();

    // Find the opened dialog
    const dialog = await getCreateContributionDialog(page, templateData);

    // Verify the Title field is present
    await expect(
      dialog.getByRole('textbox', { name: 'Title' })
    ).toHaveValue(templateData.responseOptions.defaultTitle);

    // Click on save
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Verify the url has changed to include the new memo
    await expect(page).toHaveURL(new RegExp(`/memos/`));

    // Verify the contribution appears in the callout
    await expect(
      page.getByRole('heading', { name: templateData.responseOptions.defaultTitle }).first()
    ).toBeVisible();
  } else {
    // Contributions are disabled
    await expect(addContributionButton).not.toBeVisible();
  }
}