import { Locator, Page, expect } from '@playwright/test';
import { readCalloutsSetCalloutResponses } from '@alkemio/tests-lib';
import {
  must,
  sessionActor,
} from '@src/functional-e2e/helpers/lib-actor.helper';
import { CalloutTemplateForm } from '../forms/callout/callout-template-form.models';

/**
 * The callout-level comments setting of a callout made from a template, from
 * two angles. Without it a "Comments: Enabled" case asserts exactly what its
 * "Comments: Disabled" twin asserts (the contribution-settings check, which
 * also reads this switch, returns early when there is no response type).
 *
 * 1. UI — the callout's Edit dialog, once its saved values are bound (the
 *    title holds the callout's title), shows "Allow comments" in the state
 *    the template set.
 * 2. API — the stored callout's `settings.framing.commentsEnabled`.
 */
export const verifyCalloutCommentsSetting = async (
  page: Page,
  calloutContainer: Locator,
  templateData: CalloutTemplateForm,
  calloutsSetId: string
): Promise<void> => {
  await calloutContainer.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  const editDialog = page.getByRole('dialog', { name: 'Edit Post' }).last();
  await expect(editDialog).toBeVisible();
  await expect(
    editDialog.getByRole('textbox', { name: 'Title', exact: true })
  ).toHaveValue(templateData.calloutTitle);

  const moreOptions = editDialog.getByRole('button', { name: 'More options' });
  await expect(moreOptions).toBeVisible();
  await moreOptions.click();
  await expect(
    editDialog.getByRole('switch', { name: 'Allow comments' })
  ).toBeChecked({ checked: templateData.commentsEnabled });

  // Leave without saving (CRD dialogs close on Escape).
  await page.keyboard.press('Escape');
  await expect(editDialog).toBeHidden();

  const set = must(
    await readCalloutsSetCalloutResponses(
      calloutsSetId,
      await sessionActor(page)
    ),
    'read back the callouts set'
  );
  const stored = (set.lookup.calloutsSet?.callouts ?? []).filter(
    c => c.framing.profile.displayName === templateData.calloutTitle
  );
  expect(stored, 'one stored callout made from the template').toHaveLength(1);
  expect(
    stored[0].settings.framing.commentsEnabled,
    'stored commentsEnabled'
  ).toBe(templateData.commentsEnabled);
};
