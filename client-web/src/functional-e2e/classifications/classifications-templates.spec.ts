// spec: workspace#024-classifications — acceptance walks, template side
// (specs/024-classifications/repos.yaml › acceptance › US1 / US2) plus the
// seed checks and out-of-scope negatives of the manual walk (§1, §11, §12).
//
// The file seeds its own Space in beforeAll and deletes it in afterAll
// (classifications.fixture.ts); the Space library is that Space's own.
// Editor = the Space's own admin (`spaceAdmin`). The platform seed pack and
// /innovation-library are read only.
//
// Run (from client-web/):  pnpm run test:classifications

import { test as base, expect } from '@playwright/test';
import { ensurePersonaState } from '../fixtures/authenticated-session.fixture';
import {
  addEntryApi,
  BASE_URL,
  type ClassificationsFixture,
  createTemplateApi,
  EDITOR,
  emailOf,
  entriesOf,
  type EntryRead,
  gqlOk,
  libraryTemplates,
  pinCrd,
  seedClassificationsSpace,
  setActiveSpace,
  teardownClassificationsSpace,
} from './classifications.fixture';
import {
  addTemplateToSpace,
  assertSdgPreviewDialog,
  classificationSection,
  classificationSectionCount,
  classificationTemplatesTrigger,
  deleteClassificationTemplate,
  dialogDismiss,
  entryCard,
  entryKebab,
  entryLabelsInOrder,
  escapeRegExp,
  gotoSettingsAbout,
  gotoTemplatesSettings,
  openPickerDialog,
  pickerGroup,
  pickerGroupCount,
  PLATFORM_GROUP,
  removeEntry,
  SDG_VALUES,
  sectionTitleTexts,
  selectionSaved,
  SPACE_GROUP,
  templateCard,
  waitForAboutSettings,
} from './classifications.helpers';
import {
  assertConsoleClean,
  attachConsoleGuard,
  type ConsoleGuard,
} from './console-guard';

const test = base.extend<{ consoleGuard: ConsoleGuard }>({
  storageState: async ({ browser }, use) => {
    await use(await ensurePersonaState(browser, emailOf(EDITOR)));
  },
  context: async ({ context }, use) => {
    await pinCrd(context);
    await use(context);
  },
  consoleGuard: [
    async ({ page }, use, testInfo) => {
      const guard = attachConsoleGuard(page);
      await use(guard);
      assertConsoleClean(guard, testInfo.title);
    },
    { auto: true },
  ],
});

test.describe.configure({ mode: 'default' });

let fixture: ClassificationsFixture;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  fixture = await seedClassificationsSpace('classifications-templates');
  setActiveSpace(fixture);
  await ensurePersonaState(browser, emailOf(EDITOR));
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await teardownClassificationsSpace(fixture);
});

/** The stable part of an entry: what US1-AS5 requires to stay byte-identical. */
const snapshotOf = (entry: EntryRead | undefined) =>
  entry && {
    displayLabel: entry.displayLabel,
    cardinality: entry.cardinality,
    values: entry.values,
    selectedValueIDs: entry.selectedValueIDs,
  };

// ---------------------------------------------------------------------------
// TL-01 — Seeded platform vocabulary on /innovation-library (read-only)
// ---------------------------------------------------------------------------

test('TL-01 seeded library: SDGs present with the full 17-value authored sequence, no Language/Sector (FR-005a, D6)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`${BASE_URL}/innovation-library`);
  await expect(
    page.getByRole('heading', { name: 'Template Library' })
  ).toBeVisible({ timeout: 30_000 });
  const templatesSearch = page.getByRole('searchbox', {
    name: 'Search templates',
  });
  await expect(templatesSearch).toBeVisible({ timeout: 30_000 });

  // SDGs present (hard) — isolated via the server-side templates search.
  await templatesSearch.fill('SDGs');
  const sdgHeading = page.getByRole('heading', { name: 'SDGs', exact: true });
  await expect(sdgHeading.first()).toBeVisible({ timeout: 20_000 });

  test.info().annotations.push({
    type: 'observation',
    description: `SDGs classification cards listed after search: ${await sdgHeading.count()} (1 on a pristine stack; other public packs may add more)`,
  });
  // No seeded Language/Sector vocabulary (hard): anchor each term on its own search round trip.
  for (const name of ['Language', 'Sector']) {
    const settled = page.waitForResponse(
      response => {
        if (!response.url().includes('graphql')) return false;
        const body = response.request().postData() ?? '';
        return (
          body.includes('InnovationLibraryTemplatesPaginated') &&
          body.includes(`"searchTerm":"${name}"`)
        );
      },
      { timeout: 20_000 }
    );
    await templatesSearch.fill(name);
    await settled;
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(
      0
    );
  }

  // Preview dialog: meta + ALL 17 values in authored numeric order (hard).
  await templatesSearch.fill('SDGs');
  await expect(sdgHeading.first()).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Preview: SDGs' }).first().click();
  await assertSdgPreviewDialog(page);
});

// ---------------------------------------------------------------------------
// TL-01b — Innovation Library filter entry + gallery badge (manual walk §11)
// ---------------------------------------------------------------------------

// Product finding QA-PF-01 — skipped by decision of the QA lead (2026-10-02), not chased now.
// The signed manual acceptance walk (§11) ticked a "Classifications" type-filter entry and a
// Multi-select badge on the gallery card; no FR asks for either and the product renders neither
// (client-web TemplateTypeFilter ALL_TYPES omits classification, checked at develop 2e576ee17).
// Un-skip once product decides to build them; if the walk record is corrected instead, delete
// this test. The assertions are the oracle for that decision and must not be softened.
test.skip('TL-01b Innovation Library offers a Classifications type filter and badges the SDGs card (manual walk §11, no FR)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`${BASE_URL}/innovation-library`);
  await expect(
    page.getByRole('heading', { name: 'Template Library' })
  ).toBeVisible({ timeout: 30_000 });
  const templatesSearch = page.getByRole('searchbox', {
    name: 'Search templates',
  });
  await expect(templatesSearch).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: 'All', exact: true }).first().click();
  const filterMenu = page.getByRole('menu');
  await expect(filterMenu).toBeVisible();
  await expect(
    filterMenu.getByRole('menuitemcheckbox', { name: 'Classifications' })
  ).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(filterMenu).toBeHidden();

  await templatesSearch.fill('SDGs');
  const sdgHeading = page.getByRole('heading', { name: 'SDGs', exact: true });
  await expect(sdgHeading.first()).toBeVisible({ timeout: 20_000 });
  const sdgCard = page
    .getByRole('listitem')
    .filter({ has: sdgHeading })
    .first();
  await expect(sdgCard.getByText('Multi-select', { exact: true })).toHaveCount(
    1
  );
});

// ---------------------------------------------------------------------------
// TL-02 — Seed pack page /innovation-packs/platform-classifications (read-only)
// ---------------------------------------------------------------------------

test('TL-02 seed pack page: Classification templates section, chip band with +13 overflow, matching preview (FR-001, FR-005a)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto(`${BASE_URL}/innovation-packs/platform-classifications`);
  await expect(
    page.getByRole('heading', { name: 'Classifications', exact: true })
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(classificationTemplatesTrigger(page)).toBeVisible({
    timeout: 30_000,
  });

  // Section order: Classification templates precedes Community guidelines when the pack
  // renders that section at all (the seed pack holds only classification templates).
  const titles = await sectionTitleTexts(page);
  const clsIndex = titles.findIndex(t =>
    t.startsWith('Classification templates')
  );
  const cgIndex = titles.findIndex(t =>
    t.startsWith('Community guidelines templates')
  );
  expect(clsIndex).toBeGreaterThanOrEqual(0);
  if (cgIndex >= 0) {
    expect(clsIndex).toBeLessThan(cgIndex);
  } else {
    test.info().annotations.push({
      type: 'note',
      description:
        'pack page renders no Community guidelines section (the seed pack holds none); the order is asserted on the Space library in TL-04a',
    });
  }

  // SDGs card: Multi-select badge + exactly the first 4 authored chips + "+13" overflow, no banner image.
  const card = templateCard(page, 'SDGs');
  await expect(card).toBeVisible({ timeout: 20_000 });
  const band = card.getByRole('button', { name: 'Preview: SDGs' });
  await expect(band.getByText('Multi-select', { exact: true })).toBeVisible();
  for (const chip of SDG_VALUES.slice(0, 4)) {
    await expect(band.getByText(chip, { exact: true })).toBeVisible();
  }
  await expect(band.getByText('+13', { exact: true })).toBeVisible();
  await expect(band.getByText(SDG_VALUES[4], { exact: true })).toHaveCount(0);
  expect(await band.locator('img').count()).toBe(0);

  await band.click();
  await assertSdgPreviewDialog(page);
});

// ---------------------------------------------------------------------------
// TL-03 — Picker dialog contract
// ---------------------------------------------------------------------------

test.describe('TL-03 picker contract', () => {
  const TEMPLATE = 'e2e024 TL Picker';
  const DESCRIPTION =
    'Own-template description-search proof: xylophone e2e024.';

  test('TL-03 US1-AS1 — platform + Space groups with counts, descriptions, name AND description search, no create path, cancel is a no-op (FR-007, FR-007b, FR-015/016)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    // Own template with a unique description token (description-search proof).
    await createTemplateApi(fixture, {
      name: TEMPLATE,
      description: DESCRIPTION,
      values: ['e2e024 TL Picker Val'],
    });

    await gotoSettingsAbout(page);
    const entriesBefore = await entriesOf(fixture.spaceId);
    const labelsBefore = await entryLabelsInOrder(page);

    const dialog = await openPickerDialog(page);

    // Anatomy: search field on top, two labelled groups with live counts.
    const search = dialog.getByRole('textbox', { name: /^Search templates/ });
    await expect(search).toBeVisible();
    const platformHeading = dialog.getByRole('heading', {
      name: PLATFORM_GROUP,
    });
    const spaceHeading = dialog.getByRole('heading', { name: SPACE_GROUP });
    await expect(platformHeading).toBeVisible();
    await expect(spaceHeading).toBeVisible();
    const searchBox = await search.boundingBox();
    const platformBox = await platformHeading.boundingBox();
    expect(searchBox && platformBox && searchBox.y < platformBox.y).toBe(true);

    // No create-new path in the DEFAULT state (the zero-results probe below covers the
    // filtered state; FR-015/FR-016 need both).
    await expect(
      dialog.getByRole('button', { name: /create|new template/i })
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('menuitem', { name: /create|new template/i })
    ).toHaveCount(0);

    // SDGs under Platform-wide; own template under This Space's library.
    const sdgRow = pickerGroup(dialog, PLATFORM_GROUP)
      .getByRole('button', { name: /^SDGs/ })
      .first();
    await expect(sdgRow).toBeVisible();
    const ownRow = pickerGroup(dialog, SPACE_GROUP)
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(TEMPLATE)}`) })
      .first();
    await expect(ownRow).toBeVisible();

    // Row anatomy (FR-007b): icon tile, name, cardinality badge, description.
    await expect(sdgRow.locator('svg').first()).toBeVisible();
    await expect(sdgRow.getByText(/^(Multi|Single)$/)).toBeVisible();
    await expect(ownRow.locator('svg').first()).toBeVisible();
    await expect(ownRow.getByText('Multi', { exact: true })).toBeVisible();
    await expect(ownRow.getByText(/xylophone e2e024/)).toBeVisible();

    // Counts: the Space group is exactly this Space's own library (read through the API);
    // the platform group is shared with other packs, so only its floor is fixed.
    const basePlatform = await pickerGroupCount(dialog, PLATFORM_GROUP);
    const baseSpace = await pickerGroupCount(dialog, SPACE_GROUP);
    expect(basePlatform).toBeGreaterThanOrEqual(1);
    expect(baseSpace).toBeGreaterThanOrEqual(1);
    expect(baseSpace).toBe(
      (await libraryTemplates(fixture.templatesSetId)).length
    );

    // Name search filters both groups; total row count drops vs baseline.
    await search.fill('SDG');
    await expect(sdgRow).toBeVisible();
    await expect(ownRow).toHaveCount(0);
    await expect
      .poll(() => dialog.getByRole('listitem').count())
      .toBeLessThan(basePlatform + baseSpace);

    // Clearing restores both groups to the baseline counts.
    await search.fill('');
    await expect(ownRow).toBeVisible();
    expect(await pickerGroupCount(dialog, PLATFORM_GROUP)).toBe(basePlatform);
    expect(await pickerGroupCount(dialog, SPACE_GROUP)).toBe(baseSpace);

    // Description search (FR-007b): the unique token matches our own template only.
    await search.fill('xylophone');
    await expect(ownRow).toBeVisible();
    await expect(sdgRow).toHaveCount(0);

    // Zero-results state: no matches anywhere AND no create-new path.
    await search.fill('zzz-no-match-e2e024');
    await expect(dialog.getByText(/No templates match/)).toBeVisible();
    await expect(platformHeading).toHaveCount(0);
    await expect(spaceHeading).toHaveCount(0);
    await expect(
      dialog.getByRole('button', { name: /create|new template/i })
    ).toHaveCount(0);
    await expect(
      dialog.getByRole('menuitem', { name: /create|new template/i })
    ).toHaveCount(0);

    // Dismiss-negative: search typed + a row focused, then Escape → reload → nothing added.
    await search.fill('e2e024');
    const highlighted = dialog
      .getByRole('button', { name: new RegExp(`^${escapeRegExp(TEMPLATE)}`) })
      .first();
    await expect(highlighted).toBeVisible();
    await highlighted.focus();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.reload();
    await waitForAboutSettings(page);
    expect(await entryLabelsInOrder(page)).toEqual(labelsBefore);
    expect((await entriesOf(fixture.spaceId)).map(e => e.id)).toEqual(
      entriesBefore.map(e => e.id)
    );
  });
});

// ---------------------------------------------------------------------------
// TL-04 — Template authoring through the Space library
// ---------------------------------------------------------------------------

test.describe('TL-04 template authoring', () => {
  const NAME = 'e2e024 TL CRUD';
  const VALUES = [
    'e2e024 TL A',
    'e2e024 TL B',
    'e2e024 TL C',
    'e2e024 TL D',
    'e2e024 TL E',
    'e2e024 TL F',
  ];
  const REORDERED = [
    'e2e024 TL F',
    'e2e024 TL A',
    'e2e024 TL B',
    'e2e024 TL C',
    'e2e024 TL D',
    'e2e024 TL E',
  ];
  const CUSTOM_ID = 'e2e024-custom-a';
  /** FR-002c slug of these simple labels: lowercase, whitespace runs to '-'. */
  const derivedId = (label: string) => label.toLowerCase().replace(/\s+/g, '-');

  test('TL-04a US2-AS1 — section placement, create-dialog anatomy, blank/whitespace value guards, 0-values save rejected (FR-001, FR-002a)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await gotoTemplatesSettings(page);

    // Section above Community guidelines, with subtitle + numeric count badge.
    const titles = await sectionTitleTexts(page);
    const clsIndex = titles.findIndex(t =>
      t.startsWith('Classification templates')
    );
    const cgIndex = titles.findIndex(t =>
      t.startsWith('Community guidelines templates')
    );
    expect(clsIndex).toBeGreaterThanOrEqual(0);
    expect(cgIndex).toBeGreaterThanOrEqual(0);
    expect(clsIndex).toBeLessThan(cgIndex);
    await expect(classificationTemplatesTrigger(page)).toContainText(
      'Structured, reusable vocabularies such as SDGs, Language, or Sector.'
    );
    const countBefore = await classificationSectionCount(page);
    const libraryBefore = (await libraryTemplates(fixture.templatesSetId))
      .length;

    // "Add new ▾" offers Create new + Select from library.
    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await expect(
      page.getByRole('menuitem', { name: 'Create new' })
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Select from library' })
    ).toBeVisible();
    await page.getByRole('menuitem', { name: 'Create new' }).click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Create classification template' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // Dialog fields.
    await expect(
      dialog.getByRole('textbox', { name: 'Template name' })
    ).toBeVisible();
    await expect(
      dialog.getByRole('textbox', { name: 'Description' })
    ).toBeVisible();
    await expect(dialog.getByText('Tags', { exact: true })).toBeVisible();
    const cardinality = dialog.getByRole('combobox', {
      name: 'Selection type',
    });
    await expect(cardinality).toContainText(
      'Multi-select — users can pick multiple values'
    );
    await cardinality.click();
    await expect(
      page.getByRole('option', {
        name: 'Multi-select — users can pick multiple values',
      })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Single-select — users pick one value' })
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        'Define the allowed values for this classification. Type a value and press Enter.'
      )
    ).toBeVisible();
    await expect(dialog.getByText('0 values defined')).toBeVisible();

    // Input guards: [+] disabled while blank / whitespace-only.
    const addValue = dialog.getByRole('button', { name: 'Add value' });
    const quickAdd = dialog.locator('#classification-tpl-quick-add');
    await expect(addValue).toBeDisabled();
    await quickAdd.fill('   ');
    await expect(addValue).toBeDisabled();
    await quickAdd.press('Enter');
    await expect(dialog.getByText('0 values defined')).toBeVisible();
    await quickAdd.fill('');

    // 0-values save rejection (FR-002a): clear message, dialog stays open. Name and
    // description are filled so the description-required rule cannot mask it.
    await dialog.getByRole('textbox', { name: 'Template name' }).fill(NAME);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('Created by the e2e024 templates-library suite: TL-04 CRUD.');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add at least one value.')).toBeVisible();

    // …and nothing was stored. Dismissing a dirty form asks before discarding.
    await dialogDismiss(dialog).click();
    const discard = page.getByRole('alertdialog', {
      name: 'Discard your changes?',
    });
    await expect(discard).toBeVisible();
    await discard.getByRole('button', { name: 'Yes, close' }).click();
    await expect(dialog).toBeHidden();
    expect(await classificationSectionCount(page)).toBe(countBefore);
    expect((await libraryTemplates(fixture.templatesSetId)).length).toBe(
      libraryBefore
    );
  });

  test('TL-04b US2-AS1/AS2/AS4 — create with reorder + custom id, card/preview contract, stored ids, edit round-trip, offered by the picker, delete (FR-002/002b/002c)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await gotoTemplatesSettings(page);
    const countBefore = await classificationSectionCount(page);

    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await page.getByRole('menuitem', { name: 'Create new' }).click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Create classification template' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('textbox', { name: 'Template name' }).fill(NAME);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('Created by the e2e024 templates-library suite: TL-04 CRUD.');

    // Add 6 values via Enter; live counter tracks; custom ids default blank (FR-002c);
    // reorder arrows present.
    const quickAdd = dialog.locator('#classification-tpl-quick-add');
    for (const value of VALUES) {
      await quickAdd.fill(value);
      await quickAdd.press('Enter');
    }
    await expect(dialog.getByText('6 values defined')).toBeVisible();
    const labelInputs = dialog.getByRole('textbox', { name: 'Value label' });
    await expect(labelInputs).toHaveCount(6);
    const idInputs = dialog.getByRole('textbox', {
      name: 'Custom id (optional)',
    });
    await expect(idInputs).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(idInputs.nth(i)).toHaveValue('');
    await expect(
      dialog.getByRole('button', { name: 'Move value 1 up', exact: true })
    ).toBeVisible();

    // Custom id on the A row only, then move F to position 1.
    await idInputs.nth(0).fill(CUSTOM_ID);
    for (let position = 6; position >= 2; position--) {
      await dialog
        .getByRole('button', { name: `Move value ${position} up`, exact: true })
        .click();
    }
    await expect(labelInputs.nth(0)).toHaveValue('e2e024 TL F');
    await expect(labelInputs.nth(1)).toHaveValue('e2e024 TL A');

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    // Card appears; count badge grows by exactly one (this Space's library is ours alone).
    const card = templateCard(page, NAME);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(() => classificationSectionCount(page))
      .toBe(countBefore + 1);

    // Stored through the product: authored order and ids — the override verbatim, the rest slugified.
    const stored = (await libraryTemplates(fixture.templatesSetId)).find(
      t => t.profile.displayName === NAME
    );
    expect(stored?.classification?.cardinality).toBe('MULTI_SELECT');
    expect(stored?.classification?.values).toEqual(
      REORDERED.map(label => ({
        label,
        id: label === 'e2e024 TL A' ? CUSTOM_ID : derivedId(label),
      }))
    );

    // Card contract: badge + first 4 chips (reordered) + "+2" overflow, no banner.
    const band = card.getByRole('button', { name: `Preview: ${NAME}` });
    await expect(band.getByText('Multi-select', { exact: true })).toBeVisible();
    for (const chip of REORDERED.slice(0, 4)) {
      await expect(band.getByText(chip, { exact: true })).toBeVisible();
    }
    await expect(band.getByText('+2', { exact: true })).toBeVisible();
    await expect(band.getByText('e2e024 TL D', { exact: true })).toHaveCount(0);
    expect(await band.locator('img').count()).toBe(0);

    // Preview: meta + numbered grid with F first (reorder stuck through save).
    await band.click();
    const preview = page.getByRole('dialog');
    await expect(preview).toBeVisible({ timeout: 15_000 });
    await expect(preview).toContainText('Multi-select · 6 values');
    await expect(preview).toContainText('Defined values');
    const items = preview.locator('ol > li');
    await expect(items).toHaveCount(6);
    for (let i = 0; i < REORDERED.length; i++) {
      await expect(items.nth(i)).toContainText(REORDERED[i]);
      await expect(items.nth(i).locator('span').first()).toHaveText(
        String(i + 1)
      );
    }
    await preview.getByRole('button', { name: 'Close' }).click();
    await expect(preview).toBeHidden();

    // Edit round-trip: persisted order + the filled custom id; the siblings show their derived ids.
    // Centre the card first: under the sticky banner the kebab menu would open beneath it.
    await card.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await card.getByRole('button', { name: 'Template actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const edit = page
      .getByRole('dialog')
      .filter({ hasText: 'Edit classification template' });
    await expect(edit).toBeVisible({ timeout: 15_000 });
    const editLabels = edit.getByRole('textbox', { name: 'Value label' });
    await expect(editLabels).toHaveCount(6);
    for (let i = 0; i < REORDERED.length; i++)
      await expect(editLabels.nth(i)).toHaveValue(REORDERED[i]);
    const editIds = edit.getByRole('textbox', { name: 'Custom id (optional)' });
    for (let i = 0; i < 6; i++) {
      await expect(editIds.nth(i)).toHaveValue(
        REORDERED[i] === 'e2e024 TL A' ? CUSTOM_ID : derivedId(REORDERED[i])
      );
    }
    await dialogDismiss(edit).click();
    await expect(edit).toBeHidden();

    // US2-AS4: the template created through the UI is offered by the Space's picker.
    await gotoSettingsAbout(page);
    const picker = await openPickerDialog(page);
    await expect(
      pickerGroup(picker, SPACE_GROUP).getByRole('button', {
        name: new RegExp(`^${escapeRegExp(NAME)}`),
      })
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(picker).toBeHidden();

    // Delete removes exactly this card.
    expect(await deleteClassificationTemplate(page, NAME)).toBe(true);
    await expect(templateCard(page, NAME)).toHaveCount(0);
    expect(
      (await libraryTemplates(fixture.templatesSetId)).map(
        t => t.profile.displayName
      )
    ).not.toContain(NAME);
  });
});

// ---------------------------------------------------------------------------
// TL-05 — Snapshot independence, the core rule
// ---------------------------------------------------------------------------

test.describe('TL-05 snapshot independence', () => {
  const TEMPLATE = 'e2e024 TL Snapshot';
  const TEMPLATE_RENAMED = 'e2e024 TL Snapshot Renamed';
  const VAL1 = 'e2e024 TL Val1';
  const VAL2 = 'e2e024 TL Val2';
  const VAL3 = 'e2e024 TL Val3';
  const RENAMED = 'e2e024 TL Val1 RENAMED';

  // One journey, one test: each stage needs the state the previous one left, so the
  // stages are steps (a failure names its stage) rather than order-dependent tests.
  test('TL-05 US1-AS5 — template rename/edit/delete never touches the added entry; the orphaned entry still accepts writes (FR-009, FR-010, FR-010a, SC-003)', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    let snapshot: ReturnType<typeof snapshotOf>;
    const readEntry = async () =>
      (await entriesOf(fixture.spaceId)).find(e => e.displayLabel === TEMPLATE);

    await test.step('stage 1 — add the template to the Space, select Val1', async () => {
      await createTemplateApi(fixture, {
        name: TEMPLATE,
        values: [VAL1, VAL2],
      });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TEMPLATE);
      const entry = entryCard(page, TEMPLATE);
      await expect(entry).toContainText('Multi-select · 0 selected');
      const saved = selectionSaved(page);
      await entry.getByRole('checkbox', { name: VAL1 }).check();
      await expect(entry).toContainText('Multi-select · 1 selected', {
        timeout: 20_000,
      });
      await saved;
      await expect(
        entry.getByRole('list').getByText(VAL1, { exact: true })
      ).toBeVisible();
      snapshot = snapshotOf(await readEntry());
      expect(snapshot?.selectedValueIDs).toHaveLength(1);
    });

    await test.step('stage 2 — template rename, value rename and value add never touch the entry (FR-009)', async () => {
      await gotoTemplatesSettings(page);
      const card = templateCard(page, TEMPLATE);
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Template actions' }).click();
      await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
      const edit = page
        .getByRole('dialog')
        .filter({ hasText: 'Edit classification template' });
      await expect(edit).toBeVisible({ timeout: 15_000 });
      await edit
        .getByRole('textbox', { name: 'Template name' })
        .fill(TEMPLATE_RENAMED);
      const labels = edit.getByRole('textbox', { name: 'Value label' });
      await expect(labels.nth(0)).toHaveValue(VAL1);
      await labels.nth(0).fill(RENAMED);
      const quickAdd = edit.locator('#classification-tpl-quick-add');
      await quickAdd.fill(VAL3);
      await quickAdd.press('Enter');
      await expect(edit.getByText('3 values defined')).toBeVisible();
      await edit.getByRole('button', { name: 'Save' }).click();
      await expect(edit).toBeHidden({ timeout: 20_000 });
      await expect(templateCard(page, TEMPLATE_RENAMED)).toBeVisible({
        timeout: 20_000,
      });

      // Hard reload the About editor to defeat client cache.
      await gotoSettingsAbout(page);
      await page.reload();
      await waitForAboutSettings(page);
      const entry = entryCard(page, TEMPLATE);
      await expect(entry).toBeVisible();
      await expect(entry).toContainText('Multi-select · 1 selected');
      await expect(
        entry.getByRole('list').getByText(VAL1, { exact: true })
      ).toBeVisible();
      await expect(entry.getByText(RENAMED)).toHaveCount(0);
      // The selector offers exactly the original snapshot value set.
      await entryKebab(page, TEMPLATE).click();
      await page.getByRole('menuitem', { name: /Select values/ }).click();
      await expect(entry.getByRole('checkbox')).toHaveCount(2);
      await expect(entry.getByRole('checkbox', { name: VAL1 })).toBeVisible();
      await expect(entry.getByRole('checkbox', { name: VAL2 })).toBeVisible();
      await expect(entry.getByText(VAL3)).toHaveCount(0);
      // Byte-identical: label, value order, value ids, selection.
      expect(snapshotOf(await readEntry())).toEqual(snapshot);
    });

    await test.step('stage 3 — template delete leaves the entry standalone (FR-010a)', async () => {
      expect(await deleteClassificationTemplate(page, TEMPLATE_RENAMED)).toBe(
        true
      );
      await gotoSettingsAbout(page);
      await page.reload();
      await waitForAboutSettings(page);
      const entry = entryCard(page, TEMPLATE);
      await expect(entry).toBeVisible();
      await expect(entry).toContainText('Multi-select · 1 selected');
      await expect(
        entry.getByRole('list').getByText(VAL1, { exact: true })
      ).toBeVisible();
      expect(snapshotOf(await readEntry())).toEqual(snapshot);
    });

    await test.step('stage 4 — the orphaned entry still accepts and persists a write', async () => {
      await gotoSettingsAbout(page);
      const entry = entryCard(page, TEMPLATE);
      await expect(entry).toBeVisible();
      await entryKebab(page, TEMPLATE).click();
      await page.getByRole('menuitem', { name: /Select values/ }).click();
      const saved = selectionSaved(page);
      await entry.getByRole('checkbox', { name: VAL2 }).check();
      await expect(entry).toContainText('Multi-select · 2 selected', {
        timeout: 20_000,
      });
      await saved;
      // The classic dangling-reference regression: the write must SURVIVE a hard reload.
      await page.reload();
      await waitForAboutSettings(page);
      const reloaded = entryCard(page, TEMPLATE);
      await expect(reloaded).toContainText('Multi-select · 2 selected');
      await expect(
        reloaded.getByRole('list').getByText(VAL1, { exact: true })
      ).toBeVisible();
      await expect(
        reloaded.getByRole('list').getByText(VAL2, { exact: true })
      ).toBeVisible();
    });

    await test.step('stage 5 — remove the orphaned entry', async () => {
      await removeEntry(page, TEMPLATE);
      await expect(entryCard(page, TEMPLATE)).toHaveCount(0);
      await page.reload();
      await waitForAboutSettings(page);
      await expect(entryCard(page, TEMPLATE)).toHaveCount(0);
      expect(await readEntry()).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// TL-06 — Space library import of the platform SDGs
// ---------------------------------------------------------------------------

test.describe('TL-06 library import', () => {
  test('TL-06 "Select from library" pulls the platform SDGs into the Space library as an independent copy (FR-001, FR-005b)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const preState = (await libraryTemplates(fixture.templatesSetId)).map(
      t => t.profile.displayName
    );
    // A freshly seeded library: the import path is always exercised, never skipped.
    expect(preState).not.toContain('SDGs');
    await gotoTemplatesSettings(page);

    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await page.getByRole('menuitem', { name: 'Select from library' }).click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Template library' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // Platform classification templates (SDGs) are offered for import.
    const platformGroup = dialog
      .getByRole('heading', { name: 'Platform', exact: true })
      .locator('xpath=..');
    const sdgRow = platformGroup
      .getByRole('listitem')
      .filter({ hasText: 'SDGs' })
      .first();
    await expect(sdgRow).toBeVisible({ timeout: 15_000 });
    await sdgRow.getByRole('button', { name: 'Import', exact: true }).click();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();

    // Exactly one new template, the SDGs vocabulary with its ids and order copied verbatim.
    await expect
      .poll(
        async () => (await libraryTemplates(fixture.templatesSetId)).length,
        { timeout: 30_000 }
      )
      .toBe(preState.length + 1);
    const postState = await libraryTemplates(fixture.templatesSetId);
    const imported = postState.filter(
      t => !preState.includes(t.profile.displayName)
    );
    expect(imported.map(t => t.profile.displayName)).toEqual(['SDGs']);
    expect(imported[0].classification?.values.map(v => v.label)).toEqual(
      SDG_VALUES
    );
    expect(imported[0].classification?.values.map(v => v.id)).toEqual(
      SDG_VALUES.map((_, i) => `sdg-${i + 1}`)
    );

    // The imported copy renders in the Classification templates section with badge + chips.
    await gotoTemplatesSettings(page);
    const card = templateCard(page, 'SDGs');
    await expect(card).toBeVisible();
    const band = card.getByRole('button', { name: 'Preview: SDGs' });
    await expect(
      band.getByText(/^(Multi-select|Single-select)$/)
    ).toBeVisible();
    await expect(band.getByText(SDG_VALUES[0], { exact: true })).toBeVisible();
    await expect(band.getByText('+13', { exact: true })).toBeVisible();

    // It now surfaces in the Space's picker group — do NOT pick it.
    await gotoSettingsAbout(page);
    const picker = await openPickerDialog(page);
    await expect(
      pickerGroup(picker, SPACE_GROUP)
        .getByRole('button', { name: /^SDGs/ })
        .first()
    ).toBeVisible();
    await picker.getByRole('button', { name: 'Cancel' }).click();
    await expect(picker).toBeHidden();

    // Deleting the Space's copy restores the library and leaves the platform seed untouched.
    expect(await deleteClassificationTemplate(page, 'SDGs')).toBe(true);
    const restored = (await libraryTemplates(fixture.templatesSetId)).map(
      t => t.profile.displayName
    );
    expect([...restored].sort()).toEqual([...preState].sort());
    await page.goto(`${BASE_URL}/innovation-library`);
    const templatesSearch = page.getByRole('searchbox', {
      name: 'Search templates',
    });
    await expect(templatesSearch).toBeVisible({ timeout: 30_000 });
    await templatesSearch.fill('SDGs');
    await expect(
      page.getByRole('heading', { name: 'SDGs', exact: true }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});

// ---------------------------------------------------------------------------
// TL-07 — Out-of-scope negatives (manual walk §12: D2, D4, FR-021)
// ---------------------------------------------------------------------------

test.describe('TL-07 out-of-scope negatives', () => {
  const TEMPLATE = 'e2e024 TL Neg';
  const VALUE = 'e2e024 Zephyr Quotient';

  test('TL-07 no Explore chips/filter, value labels unsearchable (soft), no activity entries (D2, FR-021)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const spaceName = (
      await gqlOk<{
        lookup: { space: { about: { profile: { displayName: string } } } };
      }>(
        `query ClassificationsSpaceName($spaceId: UUID!) {
          lookup { space(ID: $spaceId) { about { profile { displayName } } } }
        }`,
        { spaceId: fixture.spaceId }
      )
    ).lookup.space.about.profile.displayName;

    // Arrange: a selected value with a deliberately unique token, so the absence
    // assertions are meaningful rather than vacuous.
    const template = await createTemplateApi(fixture, {
      name: TEMPLATE,
      values: [VALUE],
    });
    const entry = await addEntryApi(fixture.spaceId, template.id);
    await gqlOk(
      `mutation ClassificationsNegSelect($data: UpdateClassificationEntrySelectionInput!) {
        updateClassificationEntrySelection(classificationData: $data) { id }
      }`,
      {
        data: {
          classificationEntryID: entry.id,
          selectedValueIDs: [entry.values[0].id],
        },
      }
    );
    await gotoSettingsAbout(page);
    await expect(entryCard(page, TEMPLATE)).toContainText(
      'Multi-select · 1 selected',
      { timeout: 20_000 }
    );

    // Explore Spaces: no classification filter control (D2/D4, hard), with a positive control.
    await page.goto(`${BASE_URL}/spaces`);
    await expect(
      page.getByRole('heading', { name: 'Explore Spaces' })
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Filters' }).click();
    const filters = page.getByRole('menu');
    await expect(filters).toBeVisible();
    await expect(filters).toContainText(/membership/i);
    await expect(filters).not.toContainText(/classification/i);
    await page.keyboard.press('Escape');
    await expect(filters).toBeHidden();

    // This Space's card, located by name via the Explore search: it must render, and carry no chips.
    const spaceSearch = page.getByPlaceholder(/^Search spaces/);
    await expect(spaceSearch).toBeVisible({ timeout: 15_000 });
    await spaceSearch.fill(spaceName);
    await expect(
      page.getByRole('heading', { name: spaceName, exact: true }).first()
    ).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(VALUE)).toHaveCount(0);
    await expect(page.getByText(TEMPLATE)).toHaveCount(0);

    // Platform free-text search: value label and template name must not attribute this
    // Space. Soft — a live index may lag; anchored on each search's own response.
    await page
      .getByRole('button', { name: 'Search', exact: true })
      .first()
      .click();
    const searchDialog = page.getByRole('dialog');
    const searchInput = searchDialog.getByRole('textbox', {
      name: 'Search input',
    });
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    for (const term of ['Zephyr Quotient', TEMPLATE]) {
      const answered = page.waitForResponse(
        response =>
          response.url().includes('graphql') &&
          (response.request().postData() ?? '').includes(term),
        { timeout: 20_000 }
      );
      await searchInput.fill(term);
      await searchInput.press('Enter');
      await answered;
      expect
        .soft(
          await searchDialog.getByText(spaceName, { exact: true }).count(),
          `platform search for "${term}" should not attribute the Space (soft: live-stack index noise)`
        )
        .toBe(0);
    }
    await page.keyboard.press('Escape');
    await expect(searchDialog).toBeHidden();

    // Activity stream: no entry mentioning the test artifacts (FR-021).
    await page.goto(`${BASE_URL}/home`);
    await expect(
      page.getByRole('heading', { name: 'Latest Activity in my Spaces' })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'My Latest Activity' })
    ).toBeVisible({ timeout: 30_000 });
    // Settle on the FEED CONTENT (skeletons resolved, rows or the empty state) before the absences.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(
      page
        .locator('article[aria-label], a[aria-label]')
        .or(page.getByText('No recent activity', { exact: true }))
        .first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(TEMPLATE)).toHaveCount(0);
    await expect(page.getByText('Zephyr Quotient')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// TL-08 — Value-id authoring rules through the UI (FR-002c)
// ---------------------------------------------------------------------------

test.describe('TL-08 value ids', () => {
  const DUP_LABELS = 'e2e024 TL Dup Labels';
  const DUP_IDS = 'e2e024 TL Dup Ids';

  test('TL-08 US2-AS2 — duplicate labels get deterministic suffixed ids; a later label rename keeps the id (FR-002c)', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await gotoTemplatesSettings(page);
    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await page.getByRole('menuitem', { name: 'Create new' }).click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Create classification template' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog
      .getByRole('textbox', { name: 'Template name' })
      .fill(DUP_LABELS);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('TL-08 duplicate labels.');
    const quickAdd = dialog.locator('#classification-tpl-quick-add');
    for (const value of ['e2e024 TL Dutch', 'e2e024 TL Dutch']) {
      await quickAdd.fill(value);
      await quickAdd.press('Enter');
    }
    await expect(dialog.getByText('2 values defined')).toBeVisible();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    const stored = async () =>
      (await libraryTemplates(fixture.templatesSetId)).find(
        t => t.profile.displayName === DUP_LABELS
      )?.classification?.values;
    await expect.poll(stored, { timeout: 20_000 }).toEqual([
      { id: 'e2e024-tl-dutch', label: 'e2e024 TL Dutch' },
      { id: 'e2e024-tl-dutch-2', label: 'e2e024 TL Dutch' },
    ]);

    // Rename the first label: its id must not be re-derived.
    await gotoTemplatesSettings(page);
    const card = templateCard(page, DUP_LABELS);
    await card.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await card.getByRole('button', { name: 'Template actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const edit = page
      .getByRole('dialog')
      .filter({ hasText: 'Edit classification template' });
    await expect(edit).toBeVisible({ timeout: 15_000 });
    await edit
      .getByRole('textbox', { name: 'Value label' })
      .nth(0)
      .fill('e2e024 TL Nederlands');
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(edit).toBeHidden({ timeout: 20_000 });
    await expect.poll(stored, { timeout: 20_000 }).toEqual([
      { id: 'e2e024-tl-dutch', label: 'e2e024 TL Nederlands' },
      { id: 'e2e024-tl-dutch-2', label: 'e2e024 TL Dutch' },
    ]);
  });

  test('TL-08 US2-AS3 — an explicit id override that duplicates another id in the set is rejected, never suffixed (FR-002c)', async ({
    page,
    consoleGuard,
  }) => {
    test.setTimeout(90_000);
    // The server rejects the save on purpose.
    consoleGuard.allow.push(/collides/i, /override/i);
    await gotoTemplatesSettings(page);
    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await page.getByRole('menuitem', { name: 'Create new' }).click();
    const dialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Create classification template' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('textbox', { name: 'Template name' }).fill(DUP_IDS);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('TL-08 duplicate explicit ids.');
    const quickAdd = dialog.locator('#classification-tpl-quick-add');
    for (const value of ['e2e024 TL Left', 'e2e024 TL Right']) {
      await quickAdd.fill(value);
      await quickAdd.press('Enter');
    }
    const idInputs = dialog.getByRole('textbox', {
      name: 'Custom id (optional)',
    });
    await idInputs.nth(0).fill('e2e024-same');
    await idInputs.nth(1).fill('e2e024-same');
    await dialog.getByRole('button', { name: 'Save' }).click();

    // Rejected: the dialog stays open with an error, and nothing was stored under either id.
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/collide|duplicate|already|unique/i).first()
    ).toBeVisible({ timeout: 15_000 });
    expect(
      (await libraryTemplates(fixture.templatesSetId)).map(
        t => t.profile.displayName
      )
    ).not.toContain(DUP_IDS);
  });
});
