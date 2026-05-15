import { Locator, Page, expect } from '@playwright/test';
import { CalloutTemplateForm } from '../../forms/callout/callout-template-form.models';

/**
 * Returns the dialog used to add a single contribution (link / post / memo /
 * whiteboard) to a callout from the space feed.
 *
 * NOTE: only linksFiles is confirmed against the redesigned UI. Other
 * contribution-creation dialog titles are TODO and will need to be updated when
 * those response variants are exercised.
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
      // TODO: confirm the redesigned dialog title for posts.
      dialogTitle = `Submit your answer to ${templateData.calloutTitle}`;
      break;
    }
    case 'memos': {
      // TODO: confirm the redesigned dialog title for memos.
      dialogTitle = 'Create new memo';
      break;
    }
    case 'whiteboards': {
      // TODO: confirm the redesigned dialog title for whiteboards.
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
 * those aren't verified here yet (see TODO).
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

  // Posts have an extra "Enable comments" switch (comments-on-contributions).
  if (templateData.responseOptions.type === 'posts') {
    const commentsSwitch = editDialog.getByRole('switch', {
      name: 'Enable comments',
    });
    await expect(commentsSwitch).toBeAttached();
    await expect(commentsSwitch).toBeChecked({
      checked: templateData.responseOptions.enableCommentsOnPosts,
    });
  }

  // TODO: for posts / memos / whiteboards, open "Set Default Response" and
  // verify defaultTitle / defaultDescription / textInWhiteboard.

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
