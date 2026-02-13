import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

export const verifyCalloutContributionPosts = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {

  // Verify the Post contribution button is present or not based on setting
  const addContributionButton = calloutContainer.getByRole('button', { name: 'Add' }).first();
  if (templateData.responseOptions.type !== 'posts') {
    throw new Error(`Contribution type mismatch: expected posts but got ${templateData.responseOptions.type}`);
  }

  if (templateData.responseOptions.adminsCanAdd) {
    await expect(addContributionButton).toBeVisible();
    // Click on Add Post
    await addContributionButton.click();

    // Find the opened dialog
    const dialog = await getCreateContributionDialog(page, templateData);

    // Verify the Title field is present
    await expect(
      dialog.getByRole('textbox', { name: 'Title' })
    ).toHaveValue(templateData.responseOptions.defaultTitle);

    // Verify the defaultDescription is present:
    await expect(
      await dialog.getByText(templateData.responseOptions.defaultDescription, { exact: true })
    ).toBeVisible();

    // Click on save
    await dialog.getByRole('button', { name: 'Create' }).click();

    // Verify the url has changed to include the new post
    await expect(page).toHaveURL(new RegExp('/posts/'));

    // Verify the contribution appears in the callout
    await expect(
      page.getByRole('heading', { name: templateData.responseOptions.defaultTitle })
    ).toBeVisible();

    // Verify if comments are enabled or not on the contributions:
    if (templateData.responseOptions.enableCommentsOnPosts) {
      await expect(page.getByRole('button', { name: 'Comments', exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: 'Comments', exact: true })).not.toBeVisible();
    }
  } else {
    // Contributions are disabled
    await expect(addContributionButton).not.toBeVisible();
  }
}