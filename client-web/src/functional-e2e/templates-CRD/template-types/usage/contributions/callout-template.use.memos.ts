import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

/**
 * Verifies the "memo" contribution flow on a callout created from a memos-
 * response template. Validated against the live CRD UI (2026-05-19).
 *
 * Steps:
 *  1. Click the in-feed `Add memo` button (exact match to disambiguate from
 *     `Add link`, `Add post`, page-level `Add Post`, etc.).
 *  2. `Create new memo` dialog opens with a single `Memo title` textbox
 *     pre-filled from the template's `defaultTitle` plus Cancel / Create.
 *     There is no body field here; the body is populated from the template's
 *     `defaultDescription` once the memo is created.
 *  3. Clicking `Create` closes the create dialog AND auto-opens the new
 *     memo's detail dialog. **Don't try to find / click the new memo's card
 *     on the callout before this** - the auto-opened modal aria-hides the
 *     feed region, so any locator chain rooted in the feed will return zero
 *     elements until the modal closes.
 *  4. Memo detail dialog (anchored on the Tiptap toolbar so the dialog
 *     locator survives the title-edit toggle which removes the `Edit memo
 *     title` button mid-flow; `Delete memo` is permission-gated and not
 *     reliable):
 *       - <h2> = memo title
 *       - `Edit memo title` button next to the h2
 *       - Body Tiptap rich-text editor exposed as the dialog's role=textbox
 *         (pre-filled with `defaultDescription`)
 *       - `Close` button (no Save - the dialog autosaves on every keystroke)
 *  5. Edit the title in place: click `Edit memo title`, fill the resulting
 *     `Title` input with `<defaultTitle>-Edited<testId>`, click
 *     `Save memo title`. The h2 updates.
 *  6. Edit the body: focus the body editor, jump to end, press Enter, type
 *     `Edited<testId>` character by character via `pressSequentially` (avoid
 *     `fill` - it would replace the body, not append).
 *  7. Close the dialog with `Close`. The feed region is no longer aria-hidden.
 *  8. The card preview on the callout now reflects both edits: the edited
 *     title plus a body that concatenates the original `defaultDescription`
 *     and the new `Edited<testId>` line.
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

  const { defaultTitle, defaultDescription, adminsCanAdd } =
    templateData.responseOptions;
  const { testId } = templateData;
  const editedTitle = `${defaultTitle}-Edited${testId}`;
  const bodyEdition = `Edited${testId}`;

  const addContributionButton = calloutContainer.getByRole('button', {
    name: 'Add memo',
    exact: true,
  });

  if (!adminsCanAdd) {
    await expect(addContributionButton).not.toBeVisible();
    return;
  }

  // 1. Add a new memo (title pre-filled from the template).
  await expect(addContributionButton).toBeVisible();
  await addContributionButton.click();

  const createDialog = await getCreateContributionDialog(page, templateData);
  await expect(
    createDialog.getByRole('textbox', { name: 'Memo title' })
  ).toHaveValue(defaultTitle);
  await createDialog.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(createDialog).not.toBeVisible();

  // 2. The memo detail dialog auto-opens for the freshly created memo - no
  // need to find / click the card. Anchor on the Tiptap toolbar: locators
  // re-resolve on every action, so the anchor must outlive the title-edit
  // toggle that swaps `Edit memo title` for `Save memo title` / `Cancel
  // edit`. The toolbar (role=toolbar, name="Formatting toolbar") and the
  // dialog title h2 stay put through the whole edit, and `Delete memo` is
  // permission-gated so it isn't reliable.
  const memoDialog = page
    .getByRole('dialog')
    .filter({
      has: page.getByRole('toolbar', { name: 'Formatting toolbar' }),
    });
  await expect(memoDialog).toBeVisible();
  await expect(
    memoDialog.getByRole('heading', { level: 2, name: defaultTitle })
  ).toBeVisible();

  // 3. Edit the title.
  await memoDialog.getByRole('button', { name: 'Edit memo title' }).click();
  const titleInput = memoDialog.getByRole('textbox', { name: 'Title' });
  await expect(titleInput).toHaveValue(defaultTitle);
  await titleInput.fill(editedTitle);
  await memoDialog.getByRole('button', { name: 'Save memo title' }).click();
  await expect(
    memoDialog.getByRole('heading', { level: 2, name: editedTitle })
  ).toBeVisible();

  // 4. Edit the body. After the title input is dismissed, the dialog's only
  // role=textbox is the Tiptap body editor. Use pressSequentially so we
  // append rather than replace.
  const bodyEditor = memoDialog.getByRole('textbox').last();
  await expect(
    bodyEditor.getByText(defaultDescription, { exact: false })
  ).toBeVisible();
  await bodyEditor.click();
  await bodyEditor.press('End');
  await bodyEditor.press('Enter');
  await bodyEditor.pressSequentially(bodyEdition);
  await expect(
    bodyEditor.getByText(bodyEdition, { exact: false })
  ).toBeVisible();

  // 5. Close the dialog (autosave - no Save button).
  await memoDialog.getByRole('button', { name: 'Close' }).click();
  await expect(memoDialog).not.toBeVisible();

  // 6. The card preview on the callout now reflects both edits. The edited
  // title is no longer the original `defaultTitle`; the body snippet retains
  // the original `defaultDescription` and now also includes `bodyEdition`.
  //
  // The CRD body excerpt is rendered non-deterministically between two
  // layouts (this is the source of the historical flakiness):
  //   (a) a single flattened <p> concatenating the two lines with no
  //       separator, edit-first, e.g. "Editedbcfe70Default Memo Desc bcfe70";
  //   (b) two separate <p> elements, original-order, e.g.
  //       "Default Memo Desc 09145a" then "Edited09145a".
  // Asserting on an individual <p> (or with exact: true) is therefore brittle.
  // Instead assert against the card button as a whole: in BOTH layouts its
  // text contains the original description and the appended edit as
  // substrings. Scroll the card into view first - on long feeds it can render
  // below the fold after the modal closes.
  const editedCard = calloutContainer
    .getByRole('button')
    .filter({ hasText: editedTitle })
    .first();
  await editedCard.scrollIntoViewIfNeeded();
  await expect(editedCard).toBeVisible();
  await expect(editedCard).toContainText(defaultDescription);
  await expect(editedCard).toContainText(bodyEdition);
};
