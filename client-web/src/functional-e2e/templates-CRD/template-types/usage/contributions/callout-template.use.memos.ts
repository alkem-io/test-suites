import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

/**
 * Verifies the "memo" contribution flow on a callout that was created from a
 * template with responseType: 'memos'.
 *
 * Flow in the redesigned (CRD) UI - **not yet validated against a live memos
 * response callout** (the current scenario only seeds linksFiles + none).
 * Selectors below mirror the validated posts helper and the linksFiles "Add
 * link" pattern:
 *  1. In-feed `Add memo` button (exact match to disambiguate from `Add link`,
 *     `Add post`, top-level `Add Post`, etc.)
 *  2. `Create memo` dialog opens with `defaultTitle` in the `Title` textbox.
 *  3. The memo body shows the template's `defaultDescription` as the initial
 *     content of the rich-text editor (`Write your memo...` textbox - same
 *     accessible name used by the callout-template framing memo).
 *  4. Submit closes the dialog and the new memo renders as a clickable card
 *     inside the parent callout container (same shape as posts; the CRD UI
 *     does NOT navigate to a `/memos/<id>` page).
 *
 * @todo Replace the speculative selectors below with confirmed values once a
 *       memos-response callout exists in the test scenario. The CRD field
 *       names for the create-memo dialog were not validated in the discovery
 *       session and may differ.
 */
export const verifyCalloutContributionMemos = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  if (templateData.responseOptions.type !== 'memos') {
    throw new Error(
      `Contribution type mismatch: expected memos but got ${templateData.responseOptions.type}`
    );
  }

  const addContributionButton = calloutContainer.getByRole('button', {
    name: 'Add memo',
    exact: true,
  });

  if (!templateData.responseOptions.adminsCanAdd) {
    await expect(addContributionButton).not.toBeVisible();
    return;
  }

  await expect(addContributionButton).toBeVisible();
  await addContributionButton.click();

  const dialog = await getCreateContributionDialog(page, templateData);

  await expect(
    dialog.getByRole('textbox', { name: 'Title' })
  ).toHaveValue(templateData.responseOptions.defaultTitle);

  // Memo body uses the same `Write your memo...` rich-text editor that the
  // callout-template framing form exposes - the pre-fill should be visible.
  await expect(
    dialog
      .getByText(templateData.responseOptions.defaultDescription, {
        exact: false,
      })
      .first()
  ).toBeVisible();

  // Submit. The button name on the in-feed Create Memo dialog has not been
  // validated yet; if it differs from `Save`, update here once the test runs.
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // The created memo renders as a card inside the parent callout container,
  // same pattern as posts.
  const memoCardButton = calloutContainer
    .getByRole('button')
    .filter({ hasText: templateData.responseOptions.defaultTitle })
    .first();
  await expect(memoCardButton).toBeVisible();
};
