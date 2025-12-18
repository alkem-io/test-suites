import { Locator, Page, expect } from "@playwright/test";
import { CalloutTemplateForm } from "../../forms/callout/callout-template-form.models";
import { getCreateContributionDialog } from "./callout-template.use.contributions";


export const verifyCalloutContributionLinks = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Verify the Links & Files contribution button is present or not based on setting
  const addContributionButton = calloutContainer.getByRole('button', { name: 'Add' }).first();
  if (templateData.responseOptions.type !== 'linksFiles') {
    throw new Error(`Contribution type mismatch: expected linksFiles but got ${templateData.responseOptions.type}`);
  }

  if (templateData.responseOptions.adminsCanAdd) {
    await expect(addContributionButton).toBeVisible();
    // Click on Add Link
    await addContributionButton.click();

    // Find the opened dialog
    const dialog = await getCreateContributionDialog(page, templateData);

    // Fill in the URL field
    await dialog.getByRole('textbox', { name: 'Title' }).fill(`${templateData.testId} Link test`);
    await dialog.getByRole('textbox', { name: 'URL' }).fill(`https://example.com/test-${templateData.testId}`);
    await dialog.getByRole('textbox', { name: 'Description' }).fill(`Link test description ${templateData.testId}`);

    // Click on save link
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Verify the contribution appears in the callout
    await expect(
      calloutContainer.getByRole('link', { name: `${templateData.testId} Link test` }).first()
    ).toBeVisible();
  } else {
    // Contributions are disabled
    await expect(addContributionButton).not.toBeVisible();
  }
}