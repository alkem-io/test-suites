import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

export const verifyCalloutContributionLinks = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  if (templateData.responseOptions.type !== 'linksFiles') {
    throw new Error(
      `Contribution type mismatch: expected linksFiles but got ${templateData.responseOptions.type}`
    );
  }

  // The contribution affordance for linksFiles is a "Add link" button on the card.
  const addLinkButton = calloutContainer
    .getByRole('button', { name: 'Add link' })
    .first();

  if (!templateData.responseOptions.adminsCanAdd) {
    // Contributions are disabled - the affordance should be absent.
    await expect(addLinkButton).not.toBeVisible();
    return;
  }

  await expect(addLinkButton).toBeVisible();
  await addLinkButton.click();

  // "Add links or attach documents" dialog opens with one empty link row.
  const dialog = await getCreateContributionDialog(page, templateData);

  await dialog
    .getByLabel('Display name')
    .fill(`${templateData.testId} Link test`);
  await dialog
    .getByLabel('URL')
    .fill(`https://example.com/test-${templateData.testId}`);
  await dialog
    .getByLabel('Description')
    .fill(`Link test description ${templateData.testId}`);

  // Submit - the primary action is labelled "Add" (not "Save") in this dialog.
  await dialog.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // Verify the new contribution appears under the callout.
  await expect(
    calloutContainer
      .getByRole('link', { name: `${templateData.testId} Link test` })
      .first()
  ).toBeVisible();
};
