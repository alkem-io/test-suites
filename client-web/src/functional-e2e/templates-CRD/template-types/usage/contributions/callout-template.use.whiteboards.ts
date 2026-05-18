import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

/**
 * Verifies the "whiteboard" contribution flow on a callout that was created
 * from a template with responseType: 'whiteboards'.
 *
 * Flow in the redesigned (CRD) UI - **not yet validated against a live
 * whiteboards-response callout** (the current scenario only seeds linksFiles
 * + none). Selectors below mirror the validated posts helper and the
 * linksFiles "Add link" pattern:
 *  1. In-feed `Add whiteboard` button (exact match to avoid colliding with
 *     `Add link`, `Add post`, `Add memo`, etc.).
 *  2. `Create whiteboard` dialog opens with `defaultTitle` pre-filled in the
 *     `Title` textbox. The default whiteboard content is embedded in an
 *     Excalidraw canvas - canvas rendering can't easily be asserted on, so
 *     this helper only verifies the title field round-trip.
 *  3. Submit closes the dialog and the new whiteboard renders as a clickable
 *     card inside the parent callout container, same shape as posts/memos.
 *     The CRD UI does NOT navigate to a `/whiteboards/<id>` page.
 *
 * @todo Replace the speculative selectors below with confirmed values once a
 *       whiteboards-response callout exists in the test scenario. The CRD
 *       create-whiteboard dialog title and submit button name have not been
 *       validated in the discovery session.
 */
export const verifyCalloutContributionWhiteboards = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  if (templateData.responseOptions.type !== 'whiteboards') {
    throw new Error(
      `Contribution type mismatch: expected whiteboards but got ${templateData.responseOptions.type}`
    );
  }

  const addContributionButton = calloutContainer.getByRole('button', {
    name: 'Add whiteboard',
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

  // Submit. The button name on the in-feed Create Whiteboard dialog has not
  // been validated yet; update once the test runs against a real scenario.
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // The created whiteboard renders as a card inside the parent callout
  // container, same pattern as posts/memos.
  const whiteboardCardButton = calloutContainer
    .getByRole('button')
    .filter({ hasText: templateData.responseOptions.defaultTitle })
    .first();
  await expect(whiteboardCardButton).toBeVisible();
};
