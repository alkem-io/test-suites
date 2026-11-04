import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';
import { getWhiteboardEditorDialog } from '../../forms/whiteboards/whiteboard-dialog';

/**
 * Verifies the "whiteboard" contribution flow on a callout that was created
 * from a template with responseType: 'whiteboards'. Validated against the live
 * CRD UI (2026-05-20).
 *
 * Steps:
 *  1. In-feed `Add whiteboard` button (exact) — the type-specific affordance,
 *     matching the `Add post` / `Add memo` pattern of the other collections.
 *  2. `Create new whiteboard` dialog opens with `defaultTitle` pre-filled in
 *     the `Whiteboard title` textbox (Cancel / Create).
 *  3. Clicking `Create` closes the create dialog AND auto-opens the new
 *     whiteboard's Excalidraw editor dialog. The editor aria-hides the feed
 *     region, so the card on the callout can't be located until the editor is
 *     closed (same trap as the memos flow).
 *  4. Editor dialog (located via the shared `Drawing canvas` filter):
 *       - <h2> = whiteboard title (== defaultTitle at open time)
 *       - `Edit title` button toggles an inline title input + `Save title` /
 *         `Cancel editing`
 *       - `Close whiteboard` button (no Save — Excalidraw autosaves)
 *  5. Edit the title in place: `Edit title` → fill the inline textbox with
 *     `<defaultTitle>-Edited<testId>` → `Save title`. NB: the editor's own
 *     <h2> does NOT refresh after save (it stays on the value it had when the
 *     editor opened) — the saved title only shows once the editor is closed
 *     and the card re-renders. So we deliberately do NOT assert the in-editor
 *     heading post-save; the card check below is the source of truth.
 *  6. Close the editor (`Close whiteboard`); the feed region un-hides.
 *  7. The whiteboard card on the callout now shows the edited title.
 *
 * Not verified: the default whiteboard *content* coming from the template. The
 * canvas text is painted on the Excalidraw <canvas> and is absent from both the
 * DOM and the accessibility tree, so it cannot be asserted (the template-
 * creation and contribution-settings flows skip it for the same reason). Canvas
 * text is therefore neither asserted nor edited here.
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

  const { defaultTitle, adminsCanAdd } = templateData.responseOptions;
  const editedTitle = `${defaultTitle}-Edited${templateData.testId}`;

  const addContributionButton = calloutContainer.getByRole('button', {
    name: 'Add whiteboard',
    exact: true,
  });

  if (!adminsCanAdd) {
    await expect(addContributionButton).not.toBeVisible();
    return;
  }

  // 1. Open the Create Whiteboard dialog (title pre-filled from the template).
  await expect(addContributionButton).toBeVisible();
  await addContributionButton.click();

  const createDialog = await getCreateContributionDialog(page, templateData);
  await expect(
    createDialog.getByRole('textbox', { name: 'Whiteboard title' })
  ).toHaveValue(defaultTitle);

  await createDialog
    .getByRole('button', { name: 'Create', exact: true })
    .click();
  await expect(createDialog).not.toBeVisible();

  // 2. The Excalidraw editor auto-opens for the freshly created whiteboard.
  // Its <h2> reflects the default title at open time.
  const editorDialog = await getWhiteboardEditorDialog(page);
  await expect(
    editorDialog.getByRole('heading', { level: 2, name: defaultTitle })
  ).toBeVisible();

  // 3. Edit the title in place. The inline editor exposes the only role=textbox
  // in the dialog (the canvas text-tool input only appears once that tool is
  // selected, which we don't do).
  await editorDialog.getByRole('button', { name: 'Edit title' }).click();
  const titleInput = editorDialog.getByRole('textbox');
  await expect(titleInput).toHaveValue(defaultTitle);
  await titleInput.fill(editedTitle);
  await editorDialog.getByRole('button', { name: 'Save title' }).click();

  // 4. Close the editor (autosaves; no Save button). The feed un-hides.
  await editorDialog.getByRole('button', { name: 'Close whiteboard' }).click();
  await expect(editorDialog).not.toBeVisible();

  // 5. The whiteboard card on the callout reflects the edited title. Scroll it
  // into view first — on long feeds it can render below the fold after the
  // editor closes.
  const whiteboardCardButton = calloutContainer
    .getByRole('button')
    .filter({ hasText: editedTitle })
    .first();
  await whiteboardCardButton.scrollIntoViewIfNeeded();
  await expect(whiteboardCardButton).toBeVisible();
};
