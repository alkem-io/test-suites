/**
 * Callout (Collaboration tool) Template verification.
 *
 * Verifies a Callout Template appears in the redesigned templates list and
 * that its preview dialog shows the expected callout content. The preview
 * structure (confirmed against the live CRD UI):
 *
 *   dialog [Edit template]
 *     ├─ <h2> displayName + section name ("Collaboration tools")
 *     ├─ template description paragraph + tag list
 *     ├─ framing badge ("Text" / "Memo" / "Whiteboard" / ...)
 *     │  + comments-on/off label
 *     ├─ <h3> calloutTitle
 *     ├─ callout description (markdown - each source line becomes its own <p>)
 *     ├─ framing-specific content (memo <p>, whiteboard <img alt=calloutTitle>,
 *     │   CTA <a href=ctaUrl>ctaText</a>)
 *     └─ "ALLOWED CONTRIBUTIONS" section
 *
 * NOTE: callout-level references are NOT rendered in the preview dialog. They
 * ARE rendered on the in-feed callout once the template is used, so reference
 * assertions live in `usage/callout-template.use.ts`. Callout-level tags
 * (`calloutTags`) are likewise not rendered in the preview - they show up on
 * the in-feed callout and are asserted in the usage flow.
 */

import { expect, Page } from '@playwright/test';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';

export const verifyCalloutTemplate = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  const previewButton = page.getByRole('button', {
    name: `Preview: ${templateData.displayName}`,
    exact: true,
  });
  await expect(previewButton).toBeVisible();

  // The card shows the first couple of (template-level) tags. Each tag chip
  // is rendered twice: an absolute-positioned invisible "measuring" copy
  // (used by the responsive overflow logic) appears first in DOM order, then
  // the actual visible chip. Filter to visible matches so we don't pin the
  // hidden duplicate.
  const card = page.locator('li').filter({ has: previewButton }).last();
  for (const tag of templateData.tags.slice(0, 2)) {
    await expect(
      card.getByText(tag, { exact: true }).filter({ visible: true }).first()
    ).toBeVisible();
  }

  // Open the preview dialog
  await previewButton.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });
  await expect(dialog).toBeVisible();

  // <h2> heading is the displayName (the section name is appended in the
  // accessible name; partial name match works).
  await expect(
    dialog.getByRole('heading', { name: templateData.displayName })
  ).toBeVisible();

  // <h3> heading is the callout's own title
  await expect(
    dialog.getByRole('heading', { level: 3, name: templateData.calloutTitle })
  ).toBeVisible();

  // The callout description is rendered as markdown - each source line becomes
  // a separate <p>. The "- ID: <testId>" line appears verbatim (the template
  // description renders the same line as a <li> WITHOUT the leading dash, so
  // this assertion uniquely confirms the callout description was rendered).
  await expect(
    dialog.getByText(`- ID: ${templateData.testId}`, { exact: true }).first()
  ).toBeVisible();

  // Framing-specific content
  switch (templateData.framing.type) {
    case 'whiteboard': {
      // Whiteboard preview is an <img> whose alt is the callout title.
      await expect(
        dialog.getByRole('img', { name: templateData.calloutTitle })
      ).toBeVisible();
      break;
    }
    case 'memo': {
      // Memo content is rendered as a paragraph inside the preview body.
      await expect(
        dialog.getByText(templateData.framing.memoContent, { exact: true })
      ).toBeVisible();
      break;
    }
    case 'callToAction': {
      // CTA renders as <a href={ctaUrl}>{ctaText}</a>.
      const ctaLink = dialog
        .getByRole('link', { name: templateData.framing.ctaText })
        .first();
      await expect(ctaLink).toBeVisible();
      await expect(ctaLink).toHaveAttribute(
        'href',
        templateData.framing.ctaUrl
      );
      break;
    }
    case 'poll': {
      // Poll preview renders:
      //   <paragraph>Question: <question></paragraph>
      //   <list><listitem>option 1</listitem>…</list>
      // The 4 poll settings (multi-vote, anonymity, hide-results,
      // add-options) are admin metadata and NOT shown in the preview, so
      // verify is limited to the question + the option list.
      await expect(
        dialog.getByText(`Question: ${templateData.framing.question}`, {
          exact: true,
        })
      ).toBeVisible();
      for (const option of templateData.framing.options) {
        await expect(
          dialog.getByRole('listitem').filter({ hasText: option })
        ).toBeVisible();
      }
      break;
    }
    case 'none':
    default:
      break;
  }

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).not.toBeVisible();
};

/**
 * Verifies the four in-form "Poll Settings" flags persisted on a saved
 * poll-framing template.
 *
 * These flags are NOT surfaced by the preview dialog or the in-feed callout
 * (the in-feed poll only reveals them once a user actually votes), so the only
 * template-level place to read them back is the Edit dialog's "Poll Settings"
 * sub-dialog. This re-opens Edit, opens that sub-dialog, asserts each switch,
 * then cancels without saving. No-op for non-poll framing.
 *
 * Validated against the live CRD UI (2026-05-20): editing a saved poll template
 * repopulates the Question + options and exposes the same icon-only "Settings"
 * button as the create flow; the sub-dialog switches reflect the saved state.
 */
export const verifyPollSettings = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<void> => {
  const framing = templateData.framing;
  if (framing.type !== 'poll') return;
  const { settings } = framing;

  // Open the template's preview, then its Edit dialog.
  await page
    .getByRole('button', {
      name: `Preview: ${templateData.displayName}`,
      exact: true,
    })
    .click();
  const preview = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Edit template' }) });
  await preview.getByRole('button', { name: 'Edit template' }).click();

  const editDialog = page.getByRole('dialog', {
    name: 'Edit collaboration-tool template',
  });
  await expect(editDialog).toBeVisible();

  // Poll framing is pre-selected on a poll template; open the Poll Settings
  // sub-dialog. The button is icon-only (accessible name "Settings") - scope to
  // the dialog so it can't collide with the space banner's "Settings" link.
  await editDialog
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  const settingsDialog = page.getByRole('dialog', { name: 'Poll Settings' });
  await expect(settingsDialog).toBeVisible();

  await expect(
    settingsDialog.getByRole('switch', { name: 'Allow multiple responses' })
  ).toBeChecked({ checked: settings.allowMultipleResponses });
  await expect(
    settingsDialog.getByRole('switch', {
      name: 'Allow contributors to add options',
    })
  ).toBeChecked({ checked: settings.allowContributorsToAddOptions });
  await expect(
    settingsDialog.getByRole('switch', {
      name: 'Hide results until user votes',
    })
  ).toBeChecked({ checked: settings.hideResultsUntilUserVotes });
  await expect(
    settingsDialog.getByRole('switch', { name: 'Show voter avatars' })
  ).toBeChecked({ checked: settings.showVoterAvatars });

  // The Poll Settings dialog auto-applies (no Save button); Escape closes it.
  await page.keyboard.press('Escape');
  await expect(settingsDialog).not.toBeVisible();

  // Close the Edit dialog without saving. No changes were made, but Cancel can
  // still raise a discard confirmation - dismiss it if it appears.
  await editDialog.getByRole('button', { name: 'Cancel' }).click();
  const discardAlert = page.getByRole('alertdialog');
  if (await discardAlert.isVisible({ timeout: 500 }).catch(() => false)) {
    await discardAlert.getByRole('button', { name: 'Discard' }).click();
  }
  await expect(editDialog).not.toBeVisible();
};

/**
 * Verifies that a Callout Template card is visible in the templates list.
 */
export const verifyCalloutTemplateInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true }).first()
  ).toBeVisible();
};

/**
 * Verifies that a Callout Template card is NOT visible in the templates list.
 */
export const verifyCalloutTemplateNotInList = async (
  page: Page,
  displayName: string
): Promise<void> => {
  await expect(
    page.getByRole('heading', { name: displayName, exact: true })
  ).not.toBeVisible();
};
