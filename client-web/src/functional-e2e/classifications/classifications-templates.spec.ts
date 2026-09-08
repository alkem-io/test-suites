// spec: 024-classifications acceptance walk — suite "templates-library"
// source: specs/024-classifications/checklists/manual-acceptance-walk.md in
//         alkem-io/agents-hq (S1/S5/S6/S11/S12)
//
// Runs against the LIVE shared dev stack (http://localhost:3000, Space /eco1).
// State safety: every artifact this suite creates is prefixed "e2e024 TL",
// everything is cleaned up (per-scenario afterAll + suite-final leak sweep),
// and pre-existing state (seeded SDGs template, the user's SDGs/"UN Goals"
// entries, Space Tags) is never deleted or mutated.
//
// Run (from client-web/):
//   pnpm run test:classifications
// (config/playwright.config.classifications.ts — single worker, enforced; the
// default config ignores this directory. The file additionally pins
// mode:'default' below so its tests can never shard across workers.)

import { expect } from '@playwright/test';
import {
  createPersonaTest,
  ensurePersonaState,
} from '../fixtures/authenticated-session.fixture';
import {
  assertConsoleClean,
  attachConsoleGuard,
  type ConsoleGuard,
} from './console-guard';
import {
  addEntryFromPicker,
  assertSdgPreviewDialog,
  baseUrl,
  classificationSection,
  classificationSectionCount,
  createClassificationTemplate,
  deleteClassificationTemplateIfPresent,
  entryCard,
  entryKebab,
  escapeRegExp,
  gotoSpaceAboutSettings,
  gotoTemplatesSettings,
  listClassificationTemplateNames,
  listTlEntryLabels,
  openPicker,
  pickerGroup,
  pickerGroupCount,
  PLATFORM_GROUP,
  removeEntryIfPresent,
  SDG_VALUES,
  sectionHeaderButton,
  sectionTitleTexts,
  SPACE_GROUP,
  sweepTlArtifacts,
  templateCard,
  waitForAboutSettings,
} from './templates-library.helpers';

import type { Browser, Page } from '@playwright/test';

const EDITOR_EMAIL = 'admin@alkem.io';

const test = createPersonaTest(EDITOR_EMAIL);

// Opt this file out of fullyParallel: all of its tests run in declaration
// order on ONE worker (without serial-mode's abort-remaining-on-failure), so
// the file-level afterAll leak sweep runs exactly once, after every scenario —
// never per-worker while sibling tests are still creating artifacts. TL-05
// keeps its own inner mode:'serial' (its journey depends on stage ordering).
test.describe.configure({ mode: 'default' });

/** Open an authenticated editor page outside a test (afterAll cleanup / sweeps). */
async function withEditorPage<T>(
  browser: Browser,
  fn: (page: Page) => Promise<T>
): Promise<T> {
  const statePath = await ensurePersonaState(browser, EDITOR_EMAIL);
  const context = await browser.newContext({ storageState: statePath });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Session warmup: the cold first login for the persona otherwise runs lazily
// inside the FIRST test's storageState fixture, under that test's DEFAULT 30s
// timeout — a test.setTimeout() call in the test body cannot protect fixture
// setup, and on the loaded live stack one login attempt alone can exceed 30s
// (observed: the login form's E-Mail field took >30s to render, timing out the
// beforeEach and skipping the rest of the serial TL-05 journey). A beforeAll
// hook owns its own timeout, so the one real login happens here with a
// realistic budget; every test then loads the cached session from disk.
// ---------------------------------------------------------------------------

test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  await ensurePersonaState(browser, EDITOR_EMAIL);
});

// ---------------------------------------------------------------------------
// Console guard (adjudicated cross-cutting decision 1): collected per test,
// asserted per test, but only for errors referencing classification surfaces
// or GraphQL — never a blanket "no console errors" flake factory.
// ---------------------------------------------------------------------------

let consoleGuard: ConsoleGuard;

test.beforeEach(async ({ page }) => {
  consoleGuard = attachConsoleGuard(page);
});

test.afterEach(async ({}, testInfo) => {
  assertConsoleClean(consoleGuard, testInfo.title);
});

// ---------------------------------------------------------------------------
// Suite-final leak detector (adjudicated cross-cutting decision 2): sweep the
// suite's own "e2e024 TL" prefix off both /eco1 surfaces, verify the platform
// seed is still offered, and fail loudly if anything had leaked.
// ---------------------------------------------------------------------------

test.afterAll(async ({ browser }) => {
  // The sweep navigates both /eco1 settings surfaces plus the picker — the
  // default 30s hook budget is too tight on the live shared stack.
  test.setTimeout(180_000);
  await withEditorPage(browser, async page => {
    const leaked = await sweepTlArtifacts(page);
    // Doubles as proof the pre-existing platform seed survived the suite.
    await gotoSpaceAboutSettings(page);
    const picker = await openPicker(page);
    await expect(
      pickerGroup(picker, PLATFORM_GROUP)
        .getByRole('button', { name: /^SDGs/ })
        .first()
    ).toBeVisible();
    await picker.getByRole('button', { name: 'Cancel' }).click();
    await expect(picker).toBeHidden();
    if (leaked.length > 0) {
      throw new Error(
        `Leak detector: 'e2e024 TL' artifacts were left behind by a scenario (now swept): ${leaked.join('; ')}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// TL-01 — Seeded platform vocabulary on /innovation-library (S1, read-only)
// ---------------------------------------------------------------------------

test('TL-01 seeded library: SDGs present with the full 17-value authored sequence, no Language/Sector', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto(`${baseUrl}/innovation-library`);
  await expect(
    page.getByRole('heading', { name: 'Template Library' })
  ).toBeVisible({ timeout: 30_000 });
  const templatesSearch = page.getByRole('searchbox', {
    name: 'Search templates',
  });
  await expect(templatesSearch).toBeVisible({ timeout: 30_000 });

  // KNOWN GAP — DELIBERATELY RED (adjudicated; executor verdict: "intentionally
  // left red per policy … do not weaken"): the plan's S1/S11 requires a
  // "Classifications" entry in the /innovation-library type filter, but this
  // build's TemplateTypeFilter hard-codes ALL_TYPES without 'classification'
  // (client-web src/crd/components/innovationLibrary/TemplateTypeFilter.tsx:13).
  // expect.soft keeps the gap visible as a failing assertion — it flips green
  // the moment the product ships the filter, and flags any further regression —
  // without masking the hard seed assertions below.
  await page.getByRole('button', { name: 'All', exact: true }).first().click();
  const filterMenu = page.getByRole('menu');
  await expect(filterMenu).toBeVisible();
  const classificationsFilterEntries = await filterMenu
    .getByRole('menuitemcheckbox', { name: 'Classifications' })
    .count();
  expect
    .soft(
      classificationsFilterEntries,
      'known product gap (kept red per policy): the /innovation-library type filter offers no "Classifications" entry on this build (TemplateTypeFilter ALL_TYPES omits classification; S1/S11 requires a Classification filter chip)'
    )
    .toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Escape');
  await expect(filterMenu).toBeHidden();

  // SDGs present (hard) — isolated via the server-side templates search.
  await templatesSearch.fill('SDGs');
  const sdgHeading = page.getByRole('heading', { name: 'SDGs', exact: true });
  await expect(sdgHeading.first()).toBeVisible({ timeout: 20_000 });

  // Card multiplicity is an environment fact, not seed contract: other users'
  // public packs can legitimately add SDGs cards on the shared stack, so it
  // stays an observed-value annotation. The MISSING Multi-select badge is a
  // verified product gap (nothing classification-specific exists in
  // src/crd/components/innovationLibrary/ — cards render the generic gradient
  // header) and stays an expect.soft, DELIBERATELY RED per the executor's
  // recorded verdict — do not weaken to an annotation.
  const sdgCard = page
    .getByRole('listitem')
    .filter({ has: sdgHeading })
    .first();
  const sdgCardCount = await sdgHeading.count();
  test.info().annotations.push({
    type: 'observation',
    description: `SDGs classification cards listed after search: ${sdgCardCount} (expected 1 on a pristine stack; >1 can be legitimate shared-stack noise)`,
  });
  const multiSelectBadges = await sdgCard
    .getByText('Multi-select', { exact: true })
    .count();
  expect
    .soft(
      multiSelectBadges,
      'known product gap (kept red per policy): the SDGs gallery card on /innovation-library carries no Multi-select badge/chip band on this build (cards render the generic gradient header)'
    )
    .toBeGreaterThanOrEqual(1);

  // No seeded Language/Sector vocabulary (hard, via server-side search).
  // Anchor each iteration on THIS term's completed search roundtrip — the
  // previous set's disappearance is a vacuous anchor from the second term on
  // (the SDGs headings are already gone), and the absence assertion would
  // otherwise race the debounced in-flight search.
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
// TL-02 — Seed pack page /innovation-packs/platform-classifications (S11, read-only)
// ---------------------------------------------------------------------------

test('TL-02 seed pack page: Classification templates section, deterministic chip band with +13 overflow, matching preview', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.goto(`${baseUrl}/innovation-packs/platform-classifications`);
  await expect(
    page.getByRole('heading', { name: 'Classifications', exact: true })
  ).toBeVisible({ timeout: 30_000 });
  await expect(sectionHeaderButton(page)).toBeVisible({ timeout: 30_000 });

  // Section order: Classification templates precedes Community guidelines —
  // when the pack page renders a Community guidelines section at all (the
  // seed pack holds only classification templates, so it usually doesn't).
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
        'pack page renders no Community guidelines section (the seed pack holds none); the classification-above-community-guidelines order is asserted on /eco1/settings/templates in TL-04',
    });
  }

  // SDGs card: Multi-select badge + exactly the first 4 authored chips + "+13"
  // overflow on the muted band, no banner image.
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

  // Preview dialog matches the platform-library preview (TL-01).
  await band.click();
  await assertSdgPreviewDialog(page);
});

// ---------------------------------------------------------------------------
// TL-03 — Picker dialog contract (S2/S12)
// ---------------------------------------------------------------------------

test.describe('TL-03 picker contract', () => {
  const TEMPLATE = 'e2e024 TL Picker';
  const DESCRIPTION =
    'Own-template description-search proof: xylophone e2e024.';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await withEditorPage(browser, page =>
      deleteClassificationTemplateIfPresent(page, TEMPLATE)
    );
  });

  test('TL-03 grouping, relative counts, name AND description search, no create path, cancel-is-noop', async ({
    page,
  }) => {
    test.setTimeout(240_000);

    // Own template with a unique description token (description-search proof).
    await createClassificationTemplate(page, {
      name: TEMPLATE,
      description: DESCRIPTION,
      values: ['e2e024 TL Picker Val'],
    });

    await gotoSpaceAboutSettings(page);
    const entriesBefore = await listTlEntryLabels(page);

    const dialog = await openPicker(page);

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

    // No create-new path in the picker's DEFAULT (unfiltered) state — the
    // zero-results probe further down cannot catch an affordance that hides
    // while filtering (e.g. a footer button), so the plan's "no create path,
    // INCLUDING in the zero-results state" needs both probes (FR-015/FR-016).
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

    // Relative count baseline — NEVER absolute counts on the shared stack.
    const basePlatform = await pickerGroupCount(dialog, PLATFORM_GROUP);
    const baseSpace = await pickerGroupCount(dialog, SPACE_GROUP);
    expect(basePlatform).toBeGreaterThanOrEqual(1);
    expect(baseSpace).toBeGreaterThanOrEqual(1);

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

    // Description search (FR-007b): the unique token matches our own template.
    await search.fill('xylophone');
    await expect(ownRow).toBeVisible();
    await expect(sdgRow).toHaveCount(0);

    // Zero-results state: no matches anywhere AND no create-new path
    // (FR-015/FR-016 — the strong version of the negative).
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

    // Strengthened dismiss-negative: search term typed + a row focused, then
    // Escape → reload → the e2e024-scoped entry set is unchanged.
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
    expect(await listTlEntryLabels(page)).toEqual(entriesBefore);
  });
});

// ---------------------------------------------------------------------------
// TL-04 — Template CRUD + authoring validation (S5)
// ---------------------------------------------------------------------------

test.describe('TL-04 template CRUD + authoring', () => {
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

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await withEditorPage(browser, page =>
      deleteClassificationTemplateIfPresent(page, NAME)
    );
  });

  test('TL-04 input guards, 0-values rejection, reorder + custom-id round-trip, card/preview contract, delete', async ({
    page,
  }) => {
    test.setTimeout(300_000);
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
    await expect(sectionHeaderButton(page)).toContainText(
      'Structured, reusable vocabularies such as SDGs, Language, or Sector.'
    );
    const countBefore = await classificationSectionCount(page);

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

    // 0-values save rejection (FR-002a): clear message, dialog stays open.
    // Name AND description are filled first — the form also validates the
    // description as required, and leaving it blank would mask the 0-values
    // rejection this step is about.
    await dialog.getByRole('textbox', { name: 'Template name' }).fill(NAME);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('Created by the e2e024 templates-library suite: TL-04 CRUD.');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Add at least one value.')).toBeVisible();

    // Add 6 values via Enter; live counter tracks; custom ids default blank
    // (FR-002c); reorder arrows present.
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
    for (let i = 0; i < 6; i++) {
      await expect(idInputs.nth(i)).toHaveValue('');
    }
    await expect(
      dialog.getByRole('button', { name: 'Values 1 up', exact: true })
    ).toBeVisible();

    // Custom id on the A row only, then move F to position 1.
    await idInputs.nth(0).fill(CUSTOM_ID);
    for (let position = 6; position >= 2; position--) {
      await dialog
        .getByRole('button', { name: `Values ${position} up`, exact: true })
        .click();
    }
    await expect(labelInputs.nth(0)).toHaveValue('e2e024 TL F');
    await expect(labelInputs.nth(1)).toHaveValue('e2e024 TL A');

    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog).toBeHidden({ timeout: 20_000 });

    // Card appears; count badge is numeric and >= before + 1 (tolerant of
    // concurrent shared-stack writers).
    const card = templateCard(page, NAME);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(() => classificationSectionCount(page))
      .toBeGreaterThanOrEqual(countBefore + 1);

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

    // Edit round-trip: persisted order + the one filled custom id, siblings blank.
    // Center the card first: after the preview dialog closes, the card can sit
    // under the sticky app banner and the kebab dropdown then opens into the
    // banner region, which intercepts pointer events on the menu items.
    await card.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await card.getByRole('button', { name: 'Template actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const edit = page
      .getByRole('dialog')
      .filter({ hasText: 'Edit classification template' });
    await expect(edit).toBeVisible({ timeout: 15_000 });
    const editLabels = edit.getByRole('textbox', { name: 'Value label' });
    await expect(editLabels).toHaveCount(6);
    for (let i = 0; i < REORDERED.length; i++) {
      await expect(editLabels.nth(i)).toHaveValue(REORDERED[i]);
    }
    const editIds = edit.getByRole('textbox', { name: 'Custom id (optional)' });
    // The A row's explicit custom id persisted through save/reopen. Sibling
    // rows are NOT blank on reopen: per the field's documented contract
    // ("Leave blank to derive an id from the label") the save derives and
    // persists a slug from each label, and the edit dialog shows stored ids.
    const derivedId = (label: string) =>
      label.toLowerCase().replace(/\s+/g, '-');
    for (let i = 0; i < 6; i++) {
      await expect(editIds.nth(i)).toHaveValue(
        REORDERED[i] === 'e2e024 TL A' ? CUSTOM_ID : derivedId(REORDERED[i])
      );
    }
    await edit.getByRole('button', { name: 'Cancel' }).click();
    await expect(edit).toBeHidden();

    // Delete removes exactly this card.
    expect(await deleteClassificationTemplateIfPresent(page, NAME)).toBe(true);
    await expect(templateCard(page, NAME)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// TL-05 — Snapshot independence, THE core rule (S6, FR-009/FR-010a + write path)
// Serial stages so a mid-journey failure pinpoints the stage.
// ---------------------------------------------------------------------------

test.describe('TL-05 snapshot independence', () => {
  test.describe.configure({ mode: 'serial' });

  const TEMPLATE = 'e2e024 TL Snapshot';
  const VAL1 = 'e2e024 TL Val1';
  const VAL2 = 'e2e024 TL Val2';
  const VAL3 = 'e2e024 TL Val3';
  const RENAMED = 'e2e024 TL Val1 RENAMED';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    // Safety net only — the journey is self-cleaning (template deleted in
    // stage 3, entry removed in stage 5).
    await withEditorPage(browser, async page => {
      await removeEntryIfPresent(page, TEMPLATE).catch(() => {});
      await deleteClassificationTemplateIfPresent(page, TEMPLATE).catch(
        () => {}
      );
    });
  });

  test('TL-05 stage 1 — create the template, add it to the Space, select Val1', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await createClassificationTemplate(page, {
      name: TEMPLATE,
      values: [VAL1, VAL2],
    });
    await gotoSpaceAboutSettings(page);
    await addEntryFromPicker(page, TEMPLATE);
    const entry = entryCard(page, TEMPLATE);
    await expect(entry).toContainText('Multi-select · 0 selected');
    await entry.getByRole('checkbox', { name: VAL1 }).check();
    await expect(entry).toContainText('Multi-select · 1 selected', {
      timeout: 20_000,
    });
    // Chip renders in the chips list (below the open selector).
    await expect(
      entry.getByRole('list').getByText(VAL1, { exact: true })
    ).toBeVisible();
  });

  test('TL-05 stage 2 — template rename+add never touches the entry (FR-009)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoTemplatesSettings(page);
    const card = templateCard(page, TEMPLATE);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Template actions' }).click();
    await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
    const edit = page
      .getByRole('dialog')
      .filter({ hasText: 'Edit classification template' });
    await expect(edit).toBeVisible({ timeout: 15_000 });
    const labels = edit.getByRole('textbox', { name: 'Value label' });
    await expect(labels.nth(0)).toHaveValue(VAL1);
    await labels.nth(0).fill(RENAMED);
    const quickAdd = edit.locator('#classification-tpl-quick-add');
    await quickAdd.fill(VAL3);
    await quickAdd.press('Enter');
    await expect(edit.getByText('3 values defined')).toBeVisible();
    await edit.getByRole('button', { name: 'Save' }).click();
    await expect(edit).toBeHidden({ timeout: 20_000 });

    // Hard reload the About editor to defeat client cache.
    await gotoSpaceAboutSettings(page);
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
  });

  test('TL-05 stage 3 — template delete leaves the entry standalone (FR-010a)', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    expect(await deleteClassificationTemplateIfPresent(page, TEMPLATE)).toBe(
      true
    );
    await gotoSpaceAboutSettings(page);
    await page.reload();
    await waitForAboutSettings(page);
    const entry = entryCard(page, TEMPLATE);
    await expect(entry).toBeVisible();
    await expect(entry).toContainText('Multi-select · 1 selected');
    await expect(
      entry.getByRole('list').getByText(VAL1, { exact: true })
    ).toBeVisible();
  });

  test('TL-05 stage 4 — the orphaned entry still accepts and persists a write', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await gotoSpaceAboutSettings(page);
    const entry = entryCard(page, TEMPLATE);
    await expect(entry).toBeVisible();
    await entryKebab(page, TEMPLATE).click();
    await page.getByRole('menuitem', { name: /Select values/ }).click();
    await entry.getByRole('checkbox', { name: VAL2 }).check();
    await expect(entry).toContainText('Multi-select · 2 selected', {
      timeout: 20_000,
    });
    // The classic dangling-reference regression: verify the write SURVIVED a
    // hard reload — the server persisted a selection on a template-less entry.
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

  test('TL-05 stage 5 — remove the entry (self-cleaning journey)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    expect(await removeEntryIfPresent(page, TEMPLATE)).toBe(true);
    await expect(entryCard(page, TEMPLATE)).toHaveCount(0);
    await page.reload();
    await waitForAboutSettings(page);
    await expect(entryCard(page, TEMPLATE)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// TL-06 — Space library import of the platform SDGs (S11 import; RISKY, tamed)
// ---------------------------------------------------------------------------

test.describe('TL-06 library import', () => {
  // Hoisted to describe scope: on a test TIMEOUT Playwright abandons the test
  // body mid-flight — its finally never runs to completion (the page/context
  // is torn down under it) — so the in-body diff-fenced cleanup can be skipped
  // entirely, leaking an unprefixed 'SDGs' card the TL-prefix sweep can never
  // see. That leak flips the skip gate below, permanently disabling this test.
  // The afterAll reads these flags and finishes the job from a FRESH editor
  // context; hooks own their own timeout budget and still run after a body
  // timeout.
  let importClicked = false;
  let importedName: string | null = null;
  let bodyCleanupCompleted = false;

  test.afterAll(async ({ browser }) => {
    test.setTimeout(180_000);
    if (!importClicked || bodyCleanupCompleted) return;
    await withEditorPage(browser, async page => {
      // Mirrors the in-body finally's semantics exactly: diff-identified name
      // capped at ONE deletion, else the exact-name 'SDGs' sweep (safe by
      // construction — the skip gate proved zero pre-existing 'SDGs' cards in
      // the Space's own library, so every 'SDGs' card present now is a
      // product of this run's import window).
      if (importedName) {
        await deleteClassificationTemplateIfPresent(
          page,
          importedName,
          1
        ).catch(() => {});
      } else {
        for (let attempt = 0; attempt < 3; attempt++) {
          const removed = await deleteClassificationTemplateIfPresent(
            page,
            'SDGs'
          ).catch(() => false);
          if (!removed) break;
        }
      }
    });
  });

  test('TL-06 library import: Select from library pulls platform SDGs into the Space library (diff-fenced deletion)', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    importClicked = false;
    importedName = null;
    bodyCleanupCompleted = false;
    await gotoTemplatesSettings(page);
    const preState = await listClassificationTemplateNames(page);

    // TAMING GATE: a pre-existing SDGs copy (plausible leftover from the
    // manual walk) means the import path cannot be exercised safely — visible
    // skip, never a silent verification-only green.
    test.skip(
      preState.includes('SDGs'),
      'pre-existing SDGs copy found in the Space library — import path not exercised'
    );

    // importClicked is set immediately BEFORE the Import click: any failure
    // after the import committed (dialog-close timeout, slow render on the
    // poll, the diff fence) would otherwise leak an unprefixed 'SDGs' copy.
    // Over-triggering is harmless (the fallback delete is a no-op when no
    // card exists); under-triggering re-creates the leak.
    try {
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
      importClicked = true;
      await sdgRow.getByRole('button', { name: 'Import', exact: true }).click();
      await dialog.getByRole('button', { name: 'Done' }).click();
      await expect(dialog).toBeHidden();

      // Pre/post diff: wait for the card set to change, then require EXACTLY
      // one new card — ambiguity fails loudly instead of guessing.
      await gotoTemplatesSettings(page);
      await expect
        .poll(
          async () => (await listClassificationTemplateNames(page)).length,
          {
            timeout: 30_000,
          }
        )
        .toBeGreaterThan(preState.length);
      const postState = await listClassificationTemplateNames(page);
      const preCounts = new Map<string, number>();
      for (const name of preState) {
        preCounts.set(name, (preCounts.get(name) ?? 0) + 1);
      }
      const newNames: string[] = [];
      for (const name of postState) {
        const remaining = preCounts.get(name) ?? 0;
        if (remaining > 0) preCounts.set(name, remaining - 1);
        else newNames.push(name);
      }
      if (newNames.length !== 1) {
        test.info().annotations.push({
          type: 'cleanup-fence',
          description: `import diff yielded ${newNames.length} new cards (${newNames.join(', ') || 'none'}) — deletion skipped to protect pre-existing state; resolve manually`,
        });
        throw new Error(
          `TL-06 diff fence: expected exactly one newly-imported card, got ${newNames.length} (${newNames.join(', ') || 'none'})`
        );
      }
      importedName = newNames[0];

      // The imported copy renders in the Classification templates section
      // with badge + chips.
      const card = templateCard(page, importedName);
      await expect(card).toBeVisible();
      const band = card.getByRole('button', {
        name: `Preview: ${importedName}`,
      });
      await expect(
        band.getByText(/^(Multi-select|Single-select)$/)
      ).toBeVisible();
      await expect(
        band.getByText(SDG_VALUES[0], { exact: true })
      ).toBeVisible();
      await expect(band.getByText('+13', { exact: true })).toBeVisible();

      // It now surfaces in the Space's picker group — do NOT pick it.
      await gotoSpaceAboutSettings(page);
      const picker = await openPicker(page);
      await expect(
        pickerGroup(picker, SPACE_GROUP)
          .getByRole('button', {
            name: new RegExp(`^${escapeRegExp(importedName)}`),
          })
          .first()
      ).toBeVisible();
      await picker.getByRole('button', { name: 'Cancel' }).click();
      await expect(picker).toBeHidden();
    } finally {
      // Diff-fenced deletion, in the SAME test body, capped at ONE card: the
      // skip gate guarantees the pre-state held zero cards with the imported
      // name and the diff fence asserted exactly one new card, so the delta
      // is always 1. A concurrent actor's copy is an indistinguishable
      // snapshot — it cannot be "targeted" past the count — so the deletion
      // COUNT is bounded instead, and the restore assertion below then fails
      // loudly on any leftover concurrent copy rather than a double-delete
      // destroying it. (On a body TIMEOUT this finally is abandoned — the
      // describe-level afterAll then finishes the cleanup.)
      if (importedName) {
        await deleteClassificationTemplateIfPresent(
          page,
          importedName,
          1
        ).catch(error => {
          test.info().annotations.push({
            type: 'cleanup-fence',
            description: `failed to delete the diff-identified imported card "${importedName}": ${String(error)}`,
          });
        });
      } else if (importClicked) {
        // The import may have committed even though the diff never resolved.
        // Safe by construction: the skip gate proved zero pre-existing 'SDGs'
        // cards in the Space's own library, so every 'SDGs' card present now
        // is a product of this run's import window — removing them restores
        // the recorded pre-state, which the assertion below then verifies.
        try {
          for (let attempt = 0; attempt < 3; attempt++) {
            const removed = await deleteClassificationTemplateIfPresent(
              page,
              'SDGs'
            );
            if (!removed) break;
          }
        } catch (error) {
          test.info().annotations.push({
            type: 'cleanup-fence',
            description: `failed to delete the committed-but-undiffed imported 'SDGs' copy: ${String(error)}`,
          });
        }
      }
      // Reaching this line means the in-body cleanup ran to completion — the
      // afterAll fallback then stands down.
      bodyCleanupCompleted = true;
    }

    // Pre-state restored, platform seed untouched.
    await gotoTemplatesSettings(page);
    const restored = await listClassificationTemplateNames(page);
    expect([...restored].sort()).toEqual([...preState].sort());
    await page.goto(`${baseUrl}/innovation-library`);
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
// TL-07 — Out-of-scope negatives (S12, D2/D4, FR-021)
// ---------------------------------------------------------------------------

test.describe('TL-07 out-of-scope negatives', () => {
  const TEMPLATE = 'e2e024 TL Neg';
  const VALUE = 'e2e024 Zephyr Quotient';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    await withEditorPage(browser, async page => {
      await removeEntryIfPresent(page, TEMPLATE).catch(() => {});
      await deleteClassificationTemplateIfPresent(page, TEMPLATE).catch(
        () => {}
      );
    });
  });

  test('TL-07 no Explore chips/filter, value labels unsearchable (soft), no activity entries', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    // Arrange: a selected value with a deliberately unique token, so the
    // search-absence assertions are meaningful rather than vacuous.
    await createClassificationTemplate(page, {
      name: TEMPLATE,
      values: [VALUE],
    });
    await gotoSpaceAboutSettings(page);
    await addEntryFromPicker(page, TEMPLATE);
    const entry = entryCard(page, TEMPLATE);
    await entry.getByRole('checkbox', { name: VALUE }).check();
    await expect(entry).toContainText('Multi-select · 1 selected', {
      timeout: 20_000,
    });

    // Explore Spaces: no classification filter control (D4, hard). The
    // Filters button opens a dropdown MENU (role="menu" with Membership /
    // Privacy menuitemcheckbox groups), not a dialog.
    await page.goto(`${baseUrl}/spaces`);
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

    // Default Space card, located by name via the Explore search — never by
    // scanning the grid; skip-with-reason if unreachable on the live stack.
    const spaceSearch = page.getByPlaceholder(/^Search spaces/);
    await expect(spaceSearch).toBeVisible({ timeout: 15_000 });
    await spaceSearch.fill('Default Space');
    const spaceCardHeading = page.getByRole('heading', {
      name: 'Default Space',
      exact: true,
    });
    // waitFor, NOT isVisible: locator.isVisible() ignores its timeout option
    // and returns immediately — right after the search fill the card is
    // virtually never rendered yet, so an isVisible probe would self-skip the
    // hard chip-absence assertions on every run.
    const cardReachable = await spaceCardHeading
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (cardReachable) {
      // No classification value chips on the Space card/tile (D2/FR-021, hard).
      await expect(page.getByText(VALUE)).toHaveCount(0);
      await expect(page.getByText(TEMPLATE)).toHaveCount(0);
    } else {
      test.info().annotations.push({
        type: 'skipped-step',
        description:
          'Default Space card not reachable via Explore search on the live stack — chip-absence step skipped with reason',
      });
    }

    // Platform free-text search: value label and template name must not
    // attribute the Default Space — soft, because a hard fail here is
    // uninterpretable index noise on a live stack (adjudicated).
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
      await searchInput.fill(term);
      await searchInput.press('Enter');
      // Allow the live index round-trip to settle before reading results.
      await page.waitForTimeout(3_000);
      expect
        .soft(
          await searchDialog
            .getByText('Default Space', { exact: true })
            .count(),
          `platform search for "${term}" should not attribute the Default Space (soft: live-stack index noise is uninterpretable as a hard failure)`
        )
        .toBe(0);
    }
    await page.keyboard.press('Escape');
    await expect(searchDialog).toBeHidden();

    // Activity stream: no entry mentioning the test artifacts — absence by
    // unique name, never by count, to tolerate concurrent live-stack activity.
    await page.goto(`${baseUrl}/home`);
    await expect(
      page.getByRole('heading', { name: 'Latest Activity in my Spaces' })
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: 'My Latest Activity' })
    ).toBeVisible({ timeout: 30_000 });
    // Settle on the FEED CONTENT before the absence assertions: the section
    // headings render before the feed items load, so a toHaveCount(0) taken
    // at heading-time passes instantly and would false-pass against an
    // activity entry rendered a moment later. The feeds render a skeleton
    // with aria-busy="true" while loading, then either activity rows
    // (ActivityItem: <a aria-label> when linked, <article aria-label>
    // otherwise) or the "No recent activity" empty-state — wait for every
    // skeleton to resolve, then require at least one feed to show its
    // resolved state.
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
