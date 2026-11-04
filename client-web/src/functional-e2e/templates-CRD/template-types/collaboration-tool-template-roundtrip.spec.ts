// Collaboration-tool templates: what the template form saves must come back
// when the template is used or edited, and the creator must be able to edit
// the content they put in it. Found on dev during Release 78 verification
// (2026-10-19) while walking client-web#10423; neither defect is part of that
// story.
//
//   RT-1  Responses = Documents is stored by the server (control — passes).
//   RT-2  "Use template" preselects Documents in the Create Post dialog.
//   RT-3  The template's Edit dialog shows Documents.
//   RT-4  Editing only the description in that dialog keeps allowedTypes.
//   MT-1  A Memo template's memo is owned by its creator, who holds UPDATE_CONTENT.
//   MT-2  The creator can type in that memo from the template's Edit dialog.
//
// RT-2…RT-4 and MT-2 work on templates seeded by API as the same creator, so
// each case stands alone; RT-1 and MT-1 keep the browser authoring walk.

import { expect, type Locator, type Page } from '@playwright/test';
import {
  CalloutAllowedActors,
  CalloutContributionType,
  CalloutFramingType,
  TemplateType,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  assignLicensePlanToSpace,
  createTemplateWithData,
  getLicensePlanByName,
  getUserToken,
  readMyUser,
  readTemplatesSetTemplates,
  type CreateTemplateOnTemplatesSetInput,
} from '@alkemio/tests-lib';
import type { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../../helpers/lib-actor.helper';
import { createPersonaTest } from '../../fixtures/authenticated-session.fixture';
import { fillTemplateForm } from './forms/template-form';
import { sectionAddNewButton } from './section-helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const SPACE_ADMIN = 'space.admin@alkem.io';
const test = createPersonaTest(SPACE_ADMIN);
const uid = UniqueIDGenerator.getID();
const NAMES = {
  docResponses: `RT documents template ${uid}`, // created in the browser by RT-1
  docSeeded: `RT seeded documents template ${uid}`, // seeded by API for RT-2 / RT-3
  docEdit: `RT edit-save template ${uid}`, // seeded by API, consumed by RT-4
  memo: `MT memo template ${uid}`, // created in the browser by MT-1
  memoSeeded: `MT seeded memo template ${uid}`, // seeded by API for MT-2
} as const;

const scenarioConfig: TestScenarioConfig = {
  name: 'ct-template-roundtrip',
  space: {
    collaboration: { addTutorialCallouts: false },
    settings: { collaboration: { allowMembersToCreateCallouts: true } },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};
let scenario: OrganizationWithSpaceModel | undefined;
let creatorToken = '';
let creatorId = '';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const entitle = async (spaceID: string): Promise<void> => {
  const plan = await getLicensePlanByName('SPACE_FEATURE_OFFICE_DOCUMENTS');
  const licensePlanID = plan[0]?.id;
  if (!licensePlanID) throw new Error('no SPACE_FEATURE_OFFICE_DOCUMENTS licence plan on this platform');
  must(await assignLicensePlanToSpace(spaceID, licensePlanID), `entitle ${spaceID}`);
};

type TemplateRow = NonNullable<
  NonNullable<Awaited<ReturnType<typeof readTemplatesSetTemplates>>['data']>['lookup']['templatesSet']
>['templates'][number];
/** The template as the bearer of `token` sees it (privileges are per viewer). */
const templateByName = async (token: string, name: string): Promise<TemplateRow> => {
  const data = must(
    await readTemplatesSetTemplates(scenario!.space.templateSetId, { bearerToken: token }),
    'templates of the space library'
  );
  const row = data.lookup.templatesSet!.templates.find(t => t.profile.displayName === name);
  if (!row) throw new Error(`template "${name}" not found`);
  return row;
};

type TemplateFraming = NonNullable<NonNullable<CreateTemplateOnTemplatesSetInput['calloutData']>['framing']>;
/** createTemplate as the creator — the same mutation the template form sends. */
const seedTemplate = async (name: string, framing: Omit<TemplateFraming, 'profile'>, allowedTypes: CalloutContributionType[]): Promise<void> => {
  must(
    await createTemplateWithData(
      {
        templatesSetID: scenario!.space.templateSetId,
        type: TemplateType.Callout,
        profileData: { displayName: name },
        calloutData: {
          framing: { profile: { displayName: `${name} post` }, ...framing },
          settings: { contribution: { enabled: true, allowedTypes, canAddContributions: CalloutAllowedActors.Members, commentsEnabled: true } },
        },
      },
      { bearerToken: creatorToken }
    ),
    `seedTemplate(${name})`
  );
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
/** Picks a chip in a radiogroup strip, through its "More" menu when it is not in the row. */
const pickChip = async (page: Page, dialog: Locator, groupName: string, chip: string): Promise<void> => {
  const group = dialog.getByRole('radiogroup', { name: groupName });
  await expect(group).toBeVisible();
  const radio = group.getByRole('radio', { name: chip, exact: true });
  if ((await radio.count()) === 0) {
    // The strip's own "More" trigger sits right after its radiogroup.
    await group.locator('xpath=following-sibling::*[1]//button | following-sibling::button[1]').first().click();
    await page.getByRole('menuitem', { name: chip, exact: true }).click();
  } else {
    await radio.click();
  }
  await expect(radio).toHaveAttribute('aria-checked', 'true');
};

const openCreateTemplateDialog = async (page: Page): Promise<Locator> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}/settings/templates`);
  await page.getByRole('button', { name: /^Collaboration tools/ }).waitFor({ state: 'visible', timeout: 30_000 });
  const addNew = sectionAddNewButton(page, /^Collaboration tools/);
  const createNew = page.getByRole('menuitem', { name: 'Create new' });
  const dialog = page.getByRole('dialog', { name: 'Create collaboration-tool template' });
  await expect(async () => {
    if (!(await createNew.isVisible().catch(() => false))) await addNew.click({ timeout: 2000 });
    await createNew.click({ timeout: 2000 });
    await expect(dialog).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 20_000 });
  return dialog;
};

const saveTemplateDialog = async (page: Page, dialog: Locator, name: string): Promise<void> => {
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).not.toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
};

/** Preview card → "Edit template" → the Edit dialog. */
const openEditTemplateDialog = async (page: Page, name: string): Promise<Locator> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}/settings/templates`);
  await page.getByRole('button', { name: `Preview: ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Edit template' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit collaboration-tool template' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
};

/** "Add Post" → "Find Template" → "Use template" on `templateName`; returns the Create Post dialog. */
const useTemplateFromFeed = async (page: Page, templateName: string): Promise<Locator> => {
  await page.goto(`${baseUrl}/${scenario!.space.nameId}`);
  await page.getByRole('button', { name: 'Add Post' }).first().click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Create Post' }) }).last();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Find Template' }).click();
  const picker = page.getByRole('dialog', { name: 'Use a template' });
  await expect(picker).toBeVisible();
  const item = picker.getByRole('listitem').filter({ hasText: templateName });
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: 'Use template', exact: true }).click();
  await expect(picker).not.toBeVisible();
  return dialog;
};

const checkedChip = (dialog: Locator, groupName: string): Locator =>
  dialog.getByRole('radiogroup', { name: groupName }).locator('[role="radio"][aria-checked="true"]');

// ---------------------------------------------------------------------------
test.describe('Collaboration-tool templates: round-trip of what the form saved', () => {
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    scenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
    await entitle(scenario.space.id);
    creatorToken = await getUserToken(SPACE_ADMIN);
    creatorId = must(await readMyUser({ bearerToken: creatorToken }), 'me as the creator').me.user!.id;
    await seedTemplate(NAMES.docSeeded, { type: CalloutFramingType.None }, [CalloutContributionType.CollaboraDocument]);
    await seedTemplate(NAMES.docEdit, { type: CalloutFramingType.None }, [CalloutContributionType.CollaboraDocument]);
    await seedTemplate(NAMES.memoSeeded, { type: CalloutFramingType.Memo, memo: { profile: { displayName: `${NAMES.memoSeeded} memo` }, markdown: 'Seeded memo body.' } }, []);
    // Preconditions the cases rest on: the server stored exactly what was sent.
    expect((await templateByName(creatorToken, NAMES.docSeeded)).callout?.settings.contribution.allowedTypes).toEqual(['COLLABORA_DOCUMENT']);
    expect((await templateByName(creatorToken, NAMES.memoSeeded)).callout?.framing.type).toBe('MEMO');
  });

  test.afterAll(async () => {
    test.setTimeout(120_000);
    if (scenario) await TestScenarioFactory.cleanUpBaseScenario(scenario);
  });

  test('RT-1 — a template saved with Responses = Documents stores COLLABORA_DOCUMENT (server)', async ({ page }) => {
    test.setTimeout(120_000);
    const dialog = await openCreateTemplateDialog(page);
    await fillTemplateForm(dialog, { displayName: NAMES.docResponses, description: 'Documents as responses', tags: ['roundtrip'] });
    await dialog.getByRole('textbox', { name: 'Title' }).fill(`${NAMES.docResponses} post`);
    await pickChip(page, dialog, 'Responses', 'Documents');
    await saveTemplateDialog(page, dialog, NAMES.docResponses);

    const row = await templateByName(creatorToken, NAMES.docResponses);
    expect(row.callout?.settings.contribution.allowedTypes).toEqual(['COLLABORA_DOCUMENT']);
  });

  test('RT-2 — "Use template" preselects Documents as the response type', async ({ page }) => {
    test.skip(true, 'alkem-io/client-web#10443: the template mapper maps COLLABORA_DOCUMENT to none, so Use template seeds Responses = None');
    test.setTimeout(120_000);
    const dialog = await useTemplateFromFeed(page, NAMES.docSeeded);
    await expect(dialog.getByRole('textbox', { name: 'Title', exact: true })).toHaveValue(`${NAMES.docSeeded} post`);
    await expect(checkedChip(dialog, 'Responses')).toHaveAccessibleName('Documents');
  });

  test('RT-3 — the template Edit dialog shows Documents as the response type', async ({ page }) => {
    test.skip(true, 'alkem-io/client-web#10443: the Edit dialog loads through the same mapper and shows Responses = None');
    test.setTimeout(120_000);
    const dialog = await openEditTemplateDialog(page, NAMES.docSeeded);
    await expect(checkedChip(dialog, 'Responses')).toHaveAccessibleName('Documents');
  });

  test('RT-4 — editing the template\'s description keeps COLLABORA_DOCUMENT', async ({ page }) => {
    test.setTimeout(120_000);
    const edited = `Description edited, nothing else (${uid}).`;
    const dialog = await openEditTemplateDialog(page, NAMES.docEdit);
    // Save is inert until something changes; the response type is not what changes here.
    await dialog.getByRole('textbox', { name: 'Description' }).first().fill(edited);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).not.toBeVisible({ timeout: 30_000 });
    // The save reached the server (otherwise "allowedTypes unchanged" proves nothing) …
    await expect
      .poll(async () => (await templateByName(creatorToken, NAMES.docEdit)).profile.description?.trim())
      .toBe(edited);
    // … and it did not take the response type with it.
    const row = await templateByName(creatorToken, NAMES.docEdit);
    expect(row.callout?.settings.contribution.allowedTypes).toEqual(['COLLABORA_DOCUMENT']);
  });

  test('MT-1 — a Memo template\'s memo is owned by its creator, who may update its content', async ({ page }) => {
    test.skip(true, 'alkem-io/server#6682: template callouts are created without a userID, so the memo has no createdBy and the creator holds no UPDATE_CONTENT');
    test.setTimeout(120_000);
    const dialog = await openCreateTemplateDialog(page);
    await fillTemplateForm(dialog, { displayName: NAMES.memo, description: 'Memo framing', tags: ['roundtrip'] });
    await dialog.getByRole('textbox', { name: 'Title' }).fill(`${NAMES.memo} post`);
    await pickChip(page, dialog, 'Add to post', 'Memo');
    await saveTemplateDialog(page, dialog, NAMES.memo);

    const row = await templateByName(creatorToken, NAMES.memo);
    expect(row.callout?.framing.type).toBe('MEMO');
    expect(row.callout?.framing.memo?.createdBy?.id).toBe(creatorId);
    expect(row.callout?.framing.memo?.authorization?.myPrivileges).toContain('UPDATE_CONTENT');
  });

  test('MT-2 — the creator can type in the template\'s memo from its Edit dialog', async ({ page }) => {
    test.skip(true, 'alkem-io/server#6682: the template memo renders contenteditable=false for its creator');
    test.setTimeout(120_000);
    const edit = await openEditTemplateDialog(page, NAMES.memoSeeded);
    await edit.getByRole('button', { name: /^Open memo$/i }).click();
    const memo = page.getByRole('dialog').filter({ has: page.locator('[contenteditable]') }).last();
    await expect(memo).toBeVisible({ timeout: 20_000 });
    const editor = memo.locator('[contenteditable]').first();
    await expect(editor).toBeVisible();
    // The read-only footer is the product's own verdict; the editor flag is the DOM's.
    await expect(memo.getByText(/You don't have permission to edit this memo/)).toHaveCount(0);
    await expect(editor).toHaveAttribute('contenteditable', 'true', { timeout: 20_000 });
  });
});
