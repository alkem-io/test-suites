import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';

/**
 * Returns the dialog used to add a single contribution (link / post / memo /
 * whiteboard) to a callout from the space feed. Dialog headings validated
 * against the live CRD UI (linksFiles 2026-05-18, posts/memos/whiteboards
 * 2026-05-20).
 */
export const getCreateContributionDialog = async (
  page: Page,
  templateData: CalloutTemplateForm
): Promise<Locator> => {
  let dialogTitle = '';
  switch (templateData.responseOptions.type) {
    case 'linksFiles': {
      dialogTitle = 'Add links or attach documents';
      break;
    }
    case 'posts': {
      dialogTitle = 'Create post';
      break;
    }
    case 'memos': {
      dialogTitle = 'Create new memo';
      break;
    }
    case 'whiteboards': {
      dialogTitle = 'Create new whiteboard';
      break;
    }
    default: {
      throw new Error(
        `Unsupported contribution type: ${templateData.responseOptions.type}`
      );
    }
  }

  const dialog = page
    .getByRole('dialog')
    .filter({ has: page.getByRole('heading', { name: dialogTitle }) });
  await expect(dialog).toBeVisible();
  return dialog;
};

/**
 * Verify the contribution settings of a Callout created using the template.
 *
 * The redesigned UI exposes the same Create/Edit Post dialog for editing a
 * callout, with inline `Members can add` / `Admins can add` / `Enable comments`
 * switches (no separate "Collection settings" sub-dialog). For posts/memos/
 * whiteboards, default-title / default-description / default-whiteboard live
 * inside a `<Type> defaults` sub-dialog reached via "Set Default Response" -
 * these are round-tripped below.
 */
export const verifyContributionSettings = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm
): Promise<void> => {
  // Nothing meaningful to verify when no response collection is configured.
  if (templateData.responseOptions.type === 'none') return;

  // Open the callout's settings menu (cog icon at the top-right of the card)
  await calloutContainer.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  // Edit Post dialog: same shape as Create Post but with values prefilled.
  // Use .last() to avoid matching a stale Edit Post dialog that may still be
  // animating out from a previous test. Wait for the footer's Save button to
  // be visible before asserting on switches, since the dialog body hydrates in
  // multiple ticks and the response-section switches mount later than the
  // dialog frame.
  const editDialog = page
    .getByRole('dialog', { name: 'Edit Post' })
    .last();
  await expect(editDialog).toBeVisible();
  await expect(
    editDialog.getByRole('button', { name: 'Save', exact: true })
  ).toBeVisible();

  // Strongest readiness signal: wait until the saved response radio shows as
  // checked. The dialog frame mounts before the saved form data is bound, and
  // the inline Members/Admins switches are only rendered once the response
  // section knows which collection is active.
  const responseRadioName = {
    linksFiles: 'Links & Files',
    posts: 'Posts',
    memos: 'Memos',
    whiteboards: 'Whiteboards',
  }[templateData.responseOptions.type];
  await expect(
    editDialog
      .getByRole('radiogroup', { name: 'Responses' })
      .getByRole('radio', { name: responseRadioName, exact: true })
  ).toBeChecked();

  // Admins can add is always rendered; Members can add is only meaningful
  // (and reliably rendered) when Admins is on - the UI forces members off and
  // may hide / disable the switch when admins is off.
  const adminsSwitch = editDialog.getByRole('switch', {
    name: 'Admins can add',
  });
  await expect(adminsSwitch).toBeAttached();
  await expect(adminsSwitch).toBeChecked({
    checked: templateData.responseOptions.adminsCanAdd,
  });

  if (templateData.responseOptions.adminsCanAdd) {
    const membersSwitch = editDialog.getByRole('switch', {
      name: 'Members can add',
    });
    await expect(membersSwitch).toBeAttached();
    await expect(membersSwitch).toBeChecked({
      checked: templateData.responseOptions.membersCanAdd,
    });
  }

  // The Enable-comments-on-contributions switch IS exposed in the in-feed Edit
  // Post dialog for posts responses (validated 2026-05-19 — the earlier audit
  // had tested against a linksFiles callout where this switch doesn't apply).
  if (templateData.responseOptions.type === 'posts') {
    const enableCommentsSwitch = editDialog.getByRole('switch', {
      name: 'Enable comments',
    });
    await expect(enableCommentsSwitch).toBeAttached();
    await expect(enableCommentsSwitch).toBeChecked({
      checked: templateData.responseOptions.enableCommentsOnPosts,
    });
  }

  // The callout-level "Allow comments" switch lives behind a "More options"
  // expander in the in-feed Edit Post dialog. Expand it before asserting.
  const moreOptions = editDialog.getByRole('button', { name: 'More options' });
  if (await moreOptions.isVisible().catch(() => false)) {
    await moreOptions.click();
  }
  const allowCommentsSwitch = editDialog.getByRole('switch', {
    name: 'Allow comments',
  });
  await expect(allowCommentsSwitch).toBeAttached();
  await expect(allowCommentsSwitch).toBeChecked({
    checked: templateData.commentsEnabled,
  });

  // For posts/memos/whiteboards: verify the saved defaultTitle / default body
  // by opening "Set Default Response". This is a round-trip of what the
  // template-creation flow filled. Dialog name pattern:
  //   posts       -> "Posts defaults"
  //   memos       -> "Memos defaults"
  //   whiteboards -> "Whiteboards defaults"
  // Posts/Memos share the same shape (Default title + rich-text body); the
  // Whiteboards defaults dialog replaces the rich-text body with a "Default
  // whiteboard" preview section (two Edit buttons - icon-only + labelled,
  // same pattern as framing whiteboard).
  if (
    templateData.responseOptions.type === 'posts' ||
    templateData.responseOptions.type === 'memos' ||
    templateData.responseOptions.type === 'whiteboards'
  ) {
    await editDialog
      .getByRole('button', { name: 'Set Default Response' })
      .click();
    const defaultsDialog = page.getByRole('dialog', { name: /defaults$/ });
    await expect(defaultsDialog).toBeVisible();

    await expect(
      defaultsDialog.getByRole('textbox', { name: 'Default title' })
    ).toHaveValue(templateData.responseOptions.defaultTitle);

    if (
      templateData.responseOptions.type === 'posts' ||
      templateData.responseOptions.type === 'memos'
    ) {
      await expect(
        defaultsDialog.getByText(
          templateData.responseOptions.defaultDescription,
          { exact: false }
        )
      ).toBeVisible();
    } else {
      // Whiteboards defaults: the canvas content can't easily be asserted on,
      // but the "Default whiteboard" section + its labelled "Edit" button only
      // mount when a default whiteboard is saved on the response.
      await expect(
        defaultsDialog.getByText('Default whiteboard', { exact: true })
      ).toBeVisible();
      await expect(
        defaultsDialog
          .getByRole('button', { name: 'Edit', exact: true })
          .last()
      ).toBeVisible();
    }

    await defaultsDialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(defaultsDialog).not.toBeVisible();
  }

  // Close the edit dialog without saving. If Cancel triggers a "Discard
  // your changes?" alertdialog (e.g. because the dialog auto-normalised some
  // field on open), confirm it.
  await editDialog.getByRole('button', { name: 'Cancel' }).click();
  const discardAlert = page.getByRole('alertdialog', {
    name: 'Discard your changes?',
  });
  if (await discardAlert.isVisible({ timeout: 500 }).catch(() => false)) {
    await discardAlert.getByRole('button', { name: 'Discard' }).click();
  }
};
