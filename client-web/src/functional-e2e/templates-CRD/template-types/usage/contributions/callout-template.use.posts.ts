import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';
import { getCreateContributionDialog } from './callout-template.use.contributions';

/**
 * Verifies the "post" contribution flow on a callout that was created from a
 * template with responseType: 'posts'.
 *
 * Flow in the redesigned (CRD) UI:
 *  1. The in-feed callout card exposes an `Add post` button (lowercase 'p',
 *     exact match — `Add` alone would collide with `Add link`,
 *     `Add another reference`, etc.).
 *  2. Clicking it opens a `dialog "Create post"` with the template's
 *     `defaultTitle` pre-filled in the `Title` textbox and the template's
 *     `defaultDescription` pre-filled in the `Write your post...` rich-text
 *     editor.
 *  3. Submit is labelled `Post` (not legacy `Create`).
 *  4. After submit, the dialog closes and the user stays on the feed — the
 *     CRD UI does NOT navigate to a dedicated `/posts/<id>` page like the
 *     legacy app did. The new post contribution renders as a clickable
 *     button inside the parent callout card (text concatenates the title,
 *     author, date and a description excerpt).
 *  5. Clicking that post-card button opens a modal post-detail dialog
 *     (`dialog` with H3 = `defaultTitle`, H2 = parent callout name) where
 *     the comments-on-contributions section, if enabled, is rendered under a
 *     `heading "Discussion"` (the legacy `button "Comments"` no longer
 *     exists).
 *
 * When `adminsCanAdd` is false, the contribution affordance is omitted from
 * the parent callout card and the helper short-circuits to a not-visible
 * assertion (same shape as the linksFiles helper).
 */
export const verifyCalloutContributionPosts = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  if (templateData.responseOptions.type !== 'posts') {
    throw new Error(
      `Contribution type mismatch: expected posts but got ${templateData.responseOptions.type}`
    );
  }

  // Use exact match to disambiguate from `Add link`, `Add another reference`,
  // `Add Post` (top-level callout-creation button at the page level), etc.
  const addContributionButton = calloutContainer.getByRole('button', {
    name: 'Add post',
    exact: true,
  });

  if (!templateData.responseOptions.adminsCanAdd) {
    // Contributions are disabled — the affordance should be absent from the card.
    await expect(addContributionButton).not.toBeVisible();
    return;
  }

  await expect(addContributionButton).toBeVisible();
  await addContributionButton.click();

  // `Create post` dialog opens; both Title and the description rich-text are
  // pre-filled from the template's default response content.
  const dialog = await getCreateContributionDialog(page, templateData);

  await expect(
    dialog.getByRole('textbox', { name: 'Title' })
  ).toHaveValue(templateData.responseOptions.defaultTitle);

  // The description editor is `textbox "Write your post..."`. The pre-filled
  // text shows up both inside the editor and (after submit) on the post
  // detail; a getByText match here is enough.
  await expect(
    dialog.getByText(templateData.responseOptions.defaultDescription, {
      exact: true,
    })
  ).toBeVisible();

  // Submit — the primary action is labelled `Post`, not legacy `Create`.
  await dialog.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(dialog).not.toBeVisible();

  // The CRD UI does NOT navigate after creating a contribution — the new post
  // renders as a clickable button inside the parent callout card. Locate it
  // via the title text concatenated into the card button.
  const postCardButton = calloutContainer
    .getByRole('button')
    .filter({ hasText: templateData.responseOptions.defaultTitle })
    .first();
  await expect(postCardButton).toBeVisible();
  await postCardButton.click();

  // Clicking the post card opens a modal post-detail dialog with H3 = title.
  const postDetail = page
    .getByRole('dialog')
    .filter({
      has: page.getByRole('heading', {
        level: 3,
        name: templateData.responseOptions.defaultTitle,
        exact: true,
      }),
    });
  await expect(postDetail).toBeVisible();

  // Description renders inside the detail dialog.
  await expect(
    postDetail
      .getByText(templateData.responseOptions.defaultDescription, {
        exact: false,
      })
      .first()
  ).toBeVisible();

  // Comments-on-contributions indicator. The `Discussion` heading is only
  // visible when comments are enabled or when there are already comments on
  // the post. Since this is a freshly created post with no prior comments,
  // the heading visibility directly reflects the `enableCommentsOnPosts` flag.
  const discussionHeading = postDetail.getByRole('heading', {
    name: 'Discussion',
  });
  if (templateData.responseOptions.enableCommentsOnPosts) {
    await expect(discussionHeading).toBeVisible();
  } else {
    await expect(discussionHeading).not.toBeVisible();
  }

  // Close the detail dialog so subsequent assertions (if any) see a clean
  // page tree.
  await postDetail
    .getByRole('button', { name: 'Close dialog' })
    .click();
  await expect(postDetail).not.toBeVisible();
};
