import { expect, Page } from '@playwright/test';
import {
  createTemplateWithData,
  readTemplatesSetTemplates,
  TemplateType,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  must,
  sessionActor,
} from '@src/functional-e2e/helpers/lib-actor.helper';
import { expectMutationAnswered } from '@src/functional-e2e/helpers/space-access.helper';

/**
 * Template delete in the redesigned Templates settings page, with a positive
 * control. The control is a second template, seeded through the lib in the
 * spec's `beforeAll`, that must stay: after a reload its card on screen
 * proves the list rendered, so the deleted card's absence is an observation;
 * in the read-back it proves the delete removed only the chosen template.
 */

const previewButton = (page: Page, name: string) =>
  page.getByRole('button', { name: `Preview: ${name}`, exact: true });

const storedTemplateNames = async (
  page: Page,
  templatesSetId: string
): Promise<string[]> =>
  must(
    await readTemplatesSetTemplates(templatesSetId, await sessionActor(page)),
    'read back the templates set'
  ).lookup.templatesSet?.templates.map(t => t.profile.displayName) ?? [];

/** Seed the control template (a Post template; the list is one query for every section). */
export const seedDeleteControlTemplate = async (
  templatesSetId: string
): Promise<string> => {
  const name = `Delete control ${UniqueIDGenerator.getID()}`;
  must(
    await createTemplateWithData({
      templatesSetID: templatesSetId,
      type: TemplateType.Post,
      profileData: {
        displayName: name,
        description: 'Stays when another template is deleted',
      },
      postDefaultDescription: 'Delete control',
    }),
    'seed the delete-control template'
  );
  return name;
};

/**
 * Delete the template `name` through its card menu (Template actions →
 * Delete → "Delete template") and prove it is gone: from the server's
 * templates set (exactly one fewer, the control still there) and from the
 * list after a reload (the control's card visible first).
 *
 * `madeFromIt` names templates the spec made FROM the deleted one (the
 * whiteboard spec's 1.3); each must still be stored and listed afterwards —
 * the plan's "existing items created from the template are unaffected".
 */
export const deleteTemplateAndVerify = async (
  page: Page,
  templatesSetId: string,
  name: string,
  controlName: string,
  madeFromIt: string[] = []
): Promise<void> => {
  const kept = [controlName, ...madeFromIt];
  // Before: every card is listed and the server holds the template once.
  for (const keptName of kept) {
    await expect(previewButton(page, keptName)).toBeVisible();
  }
  await expect(previewButton(page, name)).toBeVisible();
  const before = await storedTemplateNames(page, templatesSetId);
  expect(before.filter(n => n === name), `"${name}" is stored once`).toHaveLength(1);
  for (const keptName of kept) {
    expect(before).toContain(keptName);
  }

  // The card is the innermost list item holding the preview button (same
  // anchor as verifyTemplate); its kebab is named "Template actions".
  const card = page
    .getByRole('listitem')
    .filter({ has: previewButton(page, name) })
    .last();
  await card
    .getByRole('button', { name: 'Template actions', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();

  const confirm = page.getByRole('alertdialog', { name: 'Delete template?' });
  await expect(confirm).toBeVisible();
  await expect(confirm).toContainText(
    `“${name}” will be permanently deleted.`
  );
  // The dialog closes BEFORE the deleteTemplate mutation answers (client-web
  // `useTemplatesManager.confirmDelete` clears the pending delete first), and
  // a templates-set read that lands mid-delete fails with ENTITY_NOT_FOUND on
  // the half-deleted template's profile (seen 2026-11-09). Read back only
  // once the browser's own mutation has answered.
  const deleteAnswered = expectMutationAnswered(page, 'deleteTemplate');
  await confirm
    .getByRole('button', { name: 'Delete template', exact: true })
    .click();
  await expect(confirm).toBeHidden();
  await deleteAnswered();

  // Server: the template is gone, exactly one fewer, the kept ones stay.
  const after = await storedTemplateNames(page, templatesSetId);
  expect(after.filter(n => n === name), `"${name}" is no longer stored`).toHaveLength(0);
  for (const keptName of kept) {
    expect(after, `"${keptName}" is still stored`).toContain(keptName);
  }
  expect(after).toHaveLength(before.length - 1);

  // UI after a reload: the list rendered (kept cards visible), then the
  // deleted card is absent.
  await page.reload();
  for (const keptName of kept) {
    await expect(previewButton(page, keptName)).toBeVisible();
  }
  await expect(previewButton(page, name)).toHaveCount(0);
};
