// spec: workspace#024-classifications — acceptance walks, Space side
// (specs/024-classifications/repos.yaml › acceptance › US1 / US3 / REMOVAL).
//
// Add → select → duplicate guard → single-select cardinality → About-page
// display → show/hide toggle → removal → viewer negatives → subspace picker.
//
// The file seeds its own Space (plus one subspace) in beforeAll and deletes the
// tree in afterAll (classifications.fixture.ts). Editor = the Space's own admin
// (`spaceAdmin`), viewer = a plain member (`spaceMember`).
//
// Run (from client-web/):  pnpm run test:classifications

import { test as base, expect } from '@playwright/test';
import { ensurePersonaState } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import {
  addEntryApi,
  type ClassificationsFixture,
  createTemplateApi,
  EDITOR,
  emailOf,
  entriesOf,
  gqlOk,
  libraryTemplates,
  openPersona,
  OUTSIDER,
  pinCrd,
  readEntries,
  seedClassificationsSpace,
  setActiveSpace,
  spaceUrl,
  teardownClassificationsSpace,
  VIEWER,
} from './classifications.fixture';
import {
  aboutClassificationList,
  aboutGroup,
  addTemplateToSpace,
  classificationsSection,
  classificationTemplatesTrigger,
  collectGraphQLBodies,
  conflictDialog,
  ensureClassificationTemplatesSectionOpen,
  ensureEntrySelectorOpen,
  entryCard,
  entryChips,
  entryHiddenBadge,
  entryKebab,
  entryKebabDom,
  entryLabelsInOrder,
  gotoAboutPage,
  gotoSettingsAbout,
  gotoTemplatesSettings,
  openEntryMenu,
  openPickerDialog,
  operationResponse,
  pickerRow,
  pickerGroup,
  removeConfirmDialog,
  removeEntry,
  selectionSaved,
  SPACE_GROUP,
  templatePreviewButton,
  toggleEntryDisplay,
  waitForGraphQLBody,
} from './classifications.helpers';
import {
  assertConsoleClean,
  attachConsoleGuard,
  type ConsoleGuard,
} from './console-guard';

/**
 * Editor-authenticated test (the Space admin's stored session, CRD flag pinned) with the
 * console guard attached to the default page and asserted on teardown. Other personas
 * open their own context through `openPersona`.
 */
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

// Tests run in declaration order on one worker; each owns uniquely labelled
// artifacts, so none depends on another's data.
test.describe.configure({ mode: 'default' });

let fixture: ClassificationsFixture;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  fixture = await seedClassificationsSpace('classifications-space', {
    subspace: true,
  });
  setActiveSpace(fixture);
  // One real login per persona, here with a hook-sized budget; tests reuse the stored state.
  await ensurePersonaState(browser, emailOf(EDITOR));
  await ensurePersonaState(browser, emailOf(VIEWER));
});

test.afterAll(async () => {
  test.setTimeout(120_000);
  await teardownClassificationsSpace(fixture);
});

const entryByLabel = async (label: string) =>
  (await entriesOf(fixture.spaceId)).filter(e => e.displayLabel === label);

/* ------------------------------------------------------------------ */
/* SL-01                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-01 add + select roundtrip', () => {
  const TPL = 'e2e024 SL Roundtrip';
  // Authored order differs from alphabetical (One < Three < Two) and from click order.
  const V1 = 'e2e024 SL One';
  const V2 = 'e2e024 SL Two';
  const V3 = 'e2e024 SL Three';

  test('SL-01 US1-AS2/AS4/AS8 — immediate commit, authored order, persistence, sibling-safe deselect, same entry after reselection (FR-006a/002b/012a/012d, SC-002)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await createTemplateApi(fixture, { name: TPL, values: [V1, V2, V3] });
    const card = entryCard(page, TPL);

    await test.step('pick it from "This Space\'s library"', async () => {
      await gotoSettingsAbout(page);
      const dialog = await openPickerDialog(page);
      await expect(
        pickerGroup(dialog, SPACE_GROUP).getByText(TPL, { exact: true })
      ).toBeVisible();
      await pickerRow(page, dialog, TPL).click();
      await expect(dialog).not.toBeVisible();
    });

    await test.step('immediate commit: no Save button, 0-selected meta, auto-open selector', async () => {
      await expect(card).toBeVisible();
      // FR-006a — nothing in the Classifications section buffers behind a Save.
      await expect(
        classificationsSection(page).getByRole('button', {
          name: 'Save',
          exact: true,
        })
      ).toHaveCount(0);
      await expect(card.getByText('Multi-select · 0 selected')).toBeVisible();
      // FR-012a — the selector auto-expands.
      await expect(card.locator('[role="checkbox"]')).toHaveCount(3);
    });

    await test.step('checkbox list is in authored order, never alphabetized (FR-002b)', async () => {
      await expect(card.locator('fieldset label')).toHaveText([V1, V2, V3]);
    });

    await test.step('reload: entry persists with 0 selected', async () => {
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Multi-select · 0 selected')).toBeVisible();
    });

    await test.step('tick Three then One: meta transitions + authored-order chips', async () => {
      // A 0-selected entry re-opens its selector on mount (FR-012a).
      let saved = selectionSaved(page);
      await card.getByRole('checkbox', { name: V3 }).check();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await saved;
      saved = selectionSaved(page);
      await card.getByRole('checkbox', { name: V1 }).check();
      await expect(card.getByText('Multi-select · 2 selected')).toBeVisible();
      await saved;
      // Chips render below the checkbox list, in authored order regardless of click order (FR-002b).
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V1, V3]);
    });

    await test.step('reload: both selections survive', async () => {
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Multi-select · 2 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V1, V3]);
    });

    // SC-002 / US1-AS8: the selection changes, the entry does not — same id, same sortOrder,
    // same render position, still exactly one entry with this label.
    const [before] = await entryByLabel(TPL);
    const positionBefore = (await entryLabelsInOrder(page)).indexOf(TPL);
    expect(before, 'the added entry is readable through the API').toBeDefined();
    expect(positionBefore).toBeGreaterThanOrEqual(0);

    await test.step('chip × removes only its own value; the sibling survives a reload (FR-012d)', async () => {
      // Server-ack barrier: the deselect renders optimistically.
      const saved = selectionSaved(page);
      await card.getByRole('button', { name: `Deselect ${V1}` }).click();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V3]);
      await saved;
      // An optimistic client render must not mask a full-replacement write that clobbered the sibling.
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V3]);
    });

    await test.step('SC-002: same entry id, sortOrder and position — Step A not repeated', async () => {
      const after = await entryByLabel(TPL);
      expect(after).toHaveLength(1);
      expect(after[0].id).toBe(before.id);
      expect(after[0].sortOrder).toBe(before.sortOrder);
      const v3Id = before.values.find(v => v.label === V3)?.id;
      expect(after[0].selectedValueIDs).toEqual([v3Id]);
      expect((await entryLabelsInOrder(page)).indexOf(TPL)).toBe(
        positionBefore
      );
    });

    await test.step('kebab → "Select values…" collapses and re-expands the selector', async () => {
      const inputs = card.locator('[role="checkbox"]');
      // With a live selection the selector starts collapsed after reload.
      await expect(inputs).toHaveCount(0);
      let menu = await openEntryMenu(page, TPL);
      await menu.getByRole('menuitem', { name: 'Select values…' }).click();
      await expect(inputs).toHaveCount(3);
      menu = await openEntryMenu(page, TPL);
      await menu.getByRole('menuitem', { name: 'Select values…' }).click();
      await expect(inputs).toHaveCount(0);
      menu = await openEntryMenu(page, TPL);
      await menu.getByRole('menuitem', { name: 'Select values…' }).click();
      await expect(inputs).toHaveCount(3);
    });

    await test.step('untick to zero is legal and persists (FR-012a)', async () => {
      const saved = selectionSaved(page);
      await card.getByRole('checkbox', { name: V3 }).uncheck();
      await expect(card.getByText('Multi-select · 0 selected')).toBeVisible();
      await saved;
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Multi-select · 0 selected')).toBeVisible();
    });

    // Not asserted: "no layout shift while ticking" — bounding-box checks are a visual-QA concern.
  });
});

/* ------------------------------------------------------------------ */
/* SL-02                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-02 duplicate guard', () => {
  // The alias sorts BEFORE the original, so addition order and alphabetical order disagree.
  const TPL = 'e2e024 SL Dup Zulu';
  const ALIAS = 'e2e024 SL Dup Alpha';
  const OURS = 'e2e024 SL Dup ';
  const VALUES = ['e2e024 SL Dup Zebra', 'e2e024 SL Dup Apple'];

  test('SL-02 US1-AS6 — server-side conflict dialog, pre-seeded retry, case/whitespace variants, alias persistence (FR-011a/b/c, FR-018b)', async ({
    page,
    consoleGuard,
  }) => {
    test.setTimeout(120_000);
    // This scenario provokes server-side conflicts on purpose.
    consoleGuard.allow.push(/already in use/i, /conflict/i, /duplicate/i);

    await test.step('seed: template + first entry (0 selected)', async () => {
      await createTemplateApi(fixture, { name: TPL, values: VALUES });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      await expect(
        entryCard(page, TPL).getByText('Multi-select · 0 selected')
      ).toBeVisible();
    });

    const conflict = conflictDialog(page);

    await test.step('second pick raises the server conflict dialog, pre-seeded (FR-011a/b)', async () => {
      const dialog = await openPickerDialog(page);
      // Anchor on the add response: a purely client-side duplicate check would show the
      // same dialog without a round trip.
      const attempted = operationResponse(
        page,
        'AddClassificationEntryFromTemplate'
      );
      await pickerRow(page, dialog, TPL).click();
      await attempted;
      await expect(conflict).toBeVisible();
      await expect(
        conflict.getByText(new RegExp(`labelled "${TPL}"`))
      ).toBeVisible();
      await expect(conflict.getByLabel('Display label')).toHaveValue(TPL);
      // Not a silent no-op: still exactly one entry (DOM lookup sees through aria-hidden).
      await expect(entryKebabDom(page, TPL)).toHaveCount(1);
    });

    await test.step('case variant conflicts too (FR-011c)', async () => {
      // The description echoes the label of the LAST rejected attempt, so the new text
      // only appears after the server rejected this variant.
      await conflict.getByLabel('Display label').fill('e2e024 sl dup zulu');
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await expect(conflict).toBeVisible();
      await expect(
        conflict.getByText(/labelled "e2e024 sl dup zulu"/)
      ).toBeVisible();
      await expect(entryKebabDom(page, TPL)).toHaveCount(1);
    });

    await test.step('whitespace variant: server trim-then-conflict, no second entry (FR-011c)', async () => {
      await conflict.getByLabel('Display label').fill(`${TPL} `);
      // The conflict dialog is ALREADY visible, so anchor on the server round trip.
      const attempted = operationResponse(
        page,
        'AddClassificationEntryFromTemplate'
      );
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await attempted;
      await expect(conflict).toBeVisible();
      // Attribute prefix match catches a raw trailing-space entry AND a trimmed duplicate.
      await expect(
        page.locator(`button[aria-label^="Classification actions: ${TPL}"]`)
      ).toHaveCount(1);
    });

    await test.step('accepted alias creates a second entry after the first (FR-018b)', async () => {
      await conflict.getByLabel('Display label').fill(ALIAS);
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await expect(conflict).not.toBeVisible();
      const aliasCard = entryCard(page, ALIAS);
      await expect(aliasCard).toBeVisible();
      await expect(
        aliasCard.getByText('Multi-select · 0 selected')
      ).toBeVisible();
      // Same vocabulary, authored (not alphabetical) order.
      await expect(aliasCard.locator('fieldset label')).toHaveText(VALUES);
      // Addition order (Zulu, then Alpha) — alphabetical would be the reverse.
      const ours = (await entryLabelsInOrder(page)).filter(text =>
        text.startsWith(OURS)
      );
      expect(ours).toEqual([TPL, ALIAS]);
    });

    await test.step('reload: both entries persist, in order, original casing intact', async () => {
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(entryKebab(page, TPL)).toHaveCount(1);
      await expect(entryKebab(page, ALIAS)).toHaveCount(1);
      const ours = (await entryLabelsInOrder(page)).filter(text =>
        text.startsWith(OURS)
      );
      expect(ours).toEqual([TPL, ALIAS]);
      await expect(
        entryCard(page, TPL).getByText('Multi-select · 0 selected')
      ).toBeVisible();
    });

    await test.step('API: exactly the two entries, labels stored as typed, same value ids', async () => {
      const ours = (await entriesOf(fixture.spaceId)).filter(e =>
        e.displayLabel.toLowerCase().startsWith(OURS.toLowerCase())
      );
      expect(ours.map(e => e.displayLabel)).toEqual([TPL, ALIAS]);
      expect(ours[1].values).toEqual(ours[0].values);
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-03                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-03 single-select cardinality', () => {
  const TPL = 'e2e024 SL Single';
  const RED = 'e2e024 SL Red';
  const GREEN = 'e2e024 SL Green';

  test('SL-03 US1-AS3 — radio semantics, replace-not-add, one-chip About display (FR-012)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.info().annotations.push({
      type: 'deviation',
      description:
        'The 024 UI renders ARIA radios (Radix button[role=radio]), not native input[type=radio]; ' +
        'the checked-count probe reads aria-checked through getByRole("radio", { checked: true }).',
    });
    await createTemplateApi(fixture, {
      name: TPL,
      cardinality: 'SINGLE_SELECT',
      values: [RED, GREEN],
    });
    const card = entryCard(page, TPL);

    await test.step("add via the picker; the row carries the 'Single' badge", async () => {
      await gotoSettingsAbout(page);
      const dialog = await openPickerDialog(page);
      const row = pickerRow(page, dialog, TPL);
      await expect(row.getByText('Single', { exact: true })).toBeVisible();
      await row.click();
      await expect(dialog).not.toBeVisible();
      await expect(card).toBeVisible();
    });

    await test.step('the selector renders radios, not checkboxes (FR-012)', async () => {
      await expect(card.getByRole('radio')).toHaveCount(2);
      await expect(card.locator('[role="checkbox"]')).toHaveCount(0);
    });

    await test.step('pick Red: exactly one checked radio', async () => {
      const saved = selectionSaved(page);
      await card.getByRole('radio', { name: RED }).check();
      await expect(card.getByText('Single-select · 1 selected')).toBeVisible();
      await expect(card.getByRole('radio', { checked: true })).toHaveCount(1);
      await expect(card.getByRole('radio', { name: RED })).toBeChecked();
      await saved;
    });

    await test.step('pick Green: replaces Red, never appends', async () => {
      const saved = selectionSaved(page);
      await card.getByRole('radio', { name: GREEN }).check();
      await expect(card.getByRole('radio', { name: GREEN })).toBeChecked();
      await expect(card.getByRole('radio', { name: RED })).not.toBeChecked();
      await expect(card.getByRole('radio', { checked: true })).toHaveCount(1);
      await expect(card.getByText('Single-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([GREEN]);
      await saved;
    });

    await test.step('reload: replacement persisted, still exactly one checked radio', async () => {
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Single-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([GREEN]);
      await ensureEntrySelectorOpen(page, TPL);
      await expect(card.getByRole('radio', { checked: true })).toHaveCount(1);
      await expect(card.getByRole('radio', { name: GREEN })).toBeChecked();
      const [stored] = await entryByLabel(TPL);
      expect(stored.selectedValueIDs).toEqual([
        stored.values.find(v => v.label === GREEN)?.id,
      ]);
    });

    await test.step('public About: the group renders exactly one chip', async () => {
      await gotoAboutPage(page);
      const group = aboutGroup(page, TPL);
      await expect(group).toBeVisible({ timeout: 20_000 });
      await expect(group.getByRole('list').locator('li')).toHaveText([GREEN]);
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-04                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-04 About-page display', () => {
  // Added FIRST but sorts LAST: addition order and alphabetical order disagree.
  const TPL_A = 'e2e024 SL Disp Zulu';
  const TPL_B = 'e2e024 SL Disp Alpha';
  const OURS = 'e2e024 SL Disp ';
  // Authored order differs from alphabetical.
  const A_VALUES = ['e2e024 SL DispA Yankee', 'e2e024 SL DispA Bravo'];
  const B_VALUES = ['e2e024 SL DispB Xray', 'e2e024 SL DispB Charlie'];

  test('SL-04 US3-AS1/AS4/AS5 — labelled groups, editor-only empty group, addition order incl. re-add to the end, Tags untouched, viewer read-only (FR-018/018b/018c, FR-013, SC-006)', async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);

    await test.step('seed: two templates added in order Zulu, Alpha; Zulu gets both values', async () => {
      const a = await createTemplateApi(fixture, {
        name: TPL_A,
        values: A_VALUES,
      });
      const b = await createTemplateApi(fixture, {
        name: TPL_B,
        values: B_VALUES,
      });
      await addEntryApi(fixture.spaceId, a.id);
      await addEntryApi(fixture.spaceId, b.id);
      await gotoSettingsAbout(page);
      const cardA = entryCard(page, TPL_A);
      await ensureEntrySelectorOpen(page, TPL_A);
      let saved = selectionSaved(page);
      await cardA.getByRole('checkbox', { name: A_VALUES[0] }).check();
      await saved;
      saved = selectionSaved(page);
      await cardA.getByRole('checkbox', { name: A_VALUES[1] }).check();
      await expect(cardA.getByText('Multi-select · 2 selected')).toBeVisible();
      await saved;
      // Alpha stays at 0 selected on purpose (FR-018c).
    });

    const list = aboutClassificationList(page);
    const classificationsCard = page.locator('section').filter({ has: list });

    await test.step('editor About: Classifications card with both groups', async () => {
      await gotoAboutPage(page);
      await expect(list).toBeVisible({ timeout: 20_000 });
      await expect(
        classificationsCard.getByRole('heading', {
          level: 2,
          name: 'Classifications',
        })
      ).toBeVisible();
      // Group A: its 2 selected values as chips, in authored order.
      await expect(
        aboutGroup(page, TPL_A).getByRole('list').locator('li')
      ).toHaveText(A_VALUES);
      // Group B: empty/prompting group for the editor (FR-018c).
      const groupB = aboutGroup(page, TPL_B);
      await expect(groupB).toBeVisible();
      await expect(groupB.getByText('No values selected yet.')).toBeVisible();
      // Addition order (Zulu, Alpha) — alphabetical would be the reverse (FR-018b).
      const ours = (
        await list.getByRole('heading', { level: 3 }).allTextContents()
      )
        .map(text => text.trim())
        .filter(text => text.startsWith(OURS));
      expect(ours).toEqual([TPL_A, TPL_B]);
    });

    await test.step('soft: card position below Why/Who; group titles body-weight', async () => {
      for (const aboveTitle of ['Why', 'Who']) {
        const below = await page.evaluate(title => {
          const headings = Array.from(document.querySelectorAll('section h2'));
          const above = headings.find(h => h.textContent?.trim() === title);
          const cls = headings.find(
            h => h.textContent?.trim() === 'Classifications'
          );
          if (!above || !cls) return null;
          return Boolean(
            above.compareDocumentPosition(cls) &
            Node.DOCUMENT_POSITION_FOLLOWING
          );
        }, aboveTitle);
        if (below !== null) {
          expect
            .soft(
              below,
              `Classifications card renders below the ${aboveTitle} block`
            )
            .toBe(true);
        }
      }
      const fontWeight = await list
        .getByRole('heading', { level: 3, name: TPL_A, exact: true })
        .evaluate(el => Number(getComputedStyle(el).fontWeight));
      expect
        .soft(
          fontWeight,
          'group titles are body-weight text, not bold card titles'
        )
        .toBeLessThan(700);
    });

    await test.step('freeform Tags panel intact and structurally separate (FR-013)', async () => {
      const tags = page.getByRole('list', { name: 'Tags' });
      await expect(tags).toBeVisible();
      expect(await tags.locator('li').count()).toBeGreaterThan(0);
      // Separate element from the Classifications card.
      await expect(
        classificationsCard.getByRole('list', { name: 'Tags' })
      ).toHaveCount(0);
      // The suite seeded these Tags itself, so they are hard assertions.
      for (const tag of fixture.tags) await expect(tags).toContainText(tag);
    });

    await test.step('viewer: chips visible, empty group absent, zero edit affordances', async () => {
      const viewer = await openPersona(browser, VIEWER);
      try {
        await gotoAboutPage(viewer.page);
        // Positive control: the viewer's About did render this Space's classifications.
        const vGroupA = aboutGroup(viewer.page, TPL_A);
        await expect(vGroupA).toBeVisible({ timeout: 20_000 });
        await expect(vGroupA.getByRole('list').locator('li')).toHaveText(
          A_VALUES
        );
        // Empty group is editor-only (FR-018c).
        await expect(
          aboutClassificationList(viewer.page).getByRole('heading', {
            level: 3,
            name: TPL_B,
            exact: true,
          })
        ).toHaveCount(0);
        // No edit affordances anywhere in the card.
        await expect(
          aboutClassificationList(viewer.page).getByRole('button')
        ).toHaveCount(0);
        await expect(
          aboutClassificationList(viewer.page).locator(
            '[role="checkbox"], [role="radio"]'
          )
        ).toHaveCount(0);
        await expect(
          viewer.page.getByRole('button', { name: /^Classification actions:/ })
        ).toHaveCount(0);
        await expect(
          viewer.page.getByRole('button', { name: 'Add Classification' })
        ).toHaveCount(0);
        assertConsoleClean(viewer.guard, 'SL-04 viewer');
      } finally {
        await viewer.context.close();
      }
    });

    await test.step('US3-AS5: removing and re-adding Zulu moves it to the end, with an empty selection', async () => {
      await gotoSettingsAbout(page);
      await removeEntry(page, TPL_A);
      await addTemplateToSpace(page, TPL_A);
      await expect(
        entryCard(page, TPL_A).getByText('Multi-select · 0 selected')
      ).toBeVisible();
      const ours = (await entriesOf(fixture.spaceId)).filter(e =>
        e.displayLabel.startsWith(OURS)
      );
      expect(ours.map(e => e.displayLabel)).toEqual([TPL_B, TPL_A]);
      expect(ours[1].sortOrder).toBeGreaterThan(ours[0].sortOrder);
      await gotoAboutPage(page);
      await expect(list).toBeVisible({ timeout: 20_000 });
      const rendered = (
        await list.getByRole('heading', { level: 3 }).allTextContents()
      )
        .map(text => text.trim())
        .filter(text => text.startsWith(OURS));
      expect(rendered).toEqual([TPL_B, TPL_A]);
    });

    await test.step('SC-006: the Space Tags are byte-identical after the adds and the removal', async () => {
      const data = await gqlOk<{
        lookup: {
          space: { about: { profile: { tagset: { tags: string[] } } } };
        };
      }>(
        `query ClassificationsTags($spaceId: UUID!) {
          lookup { space(ID: $spaceId) { about { profile { tagset { tags } } } } }
        }`,
        { spaceId: fixture.spaceId }
      );
      expect([...data.lookup.space.about.profile.tagset.tags].sort()).toEqual(
        [...fixture.tags].sort()
      );
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-05                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-05 show/hide toggle', () => {
  const TPL = 'e2e024 SL Hidden';
  const VALUES = ['e2e024 SL Hid V1', 'e2e024 SL Hid V2'];
  // Positive control for the viewer negative: a SHOWN entry with a value.
  const CONTROL = 'e2e024 SL Shown Control';

  test('SL-05 US3-AS2 — persistence checkpoint, editor badge vs viewer absence, reversible, anonymous API still returns the hidden entry (FR-010b/d, FR-018d)', async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);

    await test.step('seed: template + entry with one selected value; a shown control entry', async () => {
      await createTemplateApi(fixture, { name: TPL, values: VALUES });
      const control = await createTemplateApi(fixture, {
        name: CONTROL,
        values: ['e2e024 SL Ctl V'],
      });
      const controlEntry = await addEntryApi(fixture.spaceId, control.id);
      await gqlOk(
        `mutation ClassificationsControlSelect($data: UpdateClassificationEntrySelectionInput!) {
          updateClassificationEntrySelection(classificationData: $data) { id }
        }`,
        {
          data: {
            classificationEntryID: controlEntry.id,
            selectedValueIDs: [controlEntry.values[0].id],
          },
        }
      );
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      const card = entryCard(page, TPL);
      const saved = selectionSaved(page);
      await card.getByRole('checkbox', { name: VALUES[0] }).check();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await saved;
    });

    await test.step("kebab wording is 'Show on the Space page' — never 'private'/'secret'", async () => {
      const menu = await openEntryMenu(page, TPL);
      await expect(
        menu.getByRole('menuitem', { name: 'Show on the Space page' })
      ).toBeVisible();
      expect((await menu.textContent()) ?? '').not.toMatch(/private|secret/i);
      await page.keyboard.press('Escape');
      await expect(menu).not.toBeVisible();
    });

    await test.step('toggle OFF: badge persists across reload BEFORE any persona switch', async () => {
      await toggleEntryDisplay(page, TPL);
      await expect(entryHiddenBadge(page, TPL)).toBeVisible();
      expect((await entryCard(page, TPL).textContent()) ?? '').not.toMatch(
        /private|secret/i
      );
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(entryHiddenBadge(page, TPL)).toBeVisible();
    });

    await test.step('editor About: hidden group still renders, carrying the badge (FR-018d)', async () => {
      await gotoAboutPage(page);
      const group = aboutGroup(page, TPL);
      await expect(group).toBeVisible({ timeout: 20_000 });
      await expect(
        group.getByText('Not shown on the Space page')
      ).toBeVisible();
    });

    await test.step('viewer: hidden group absent from the render; its own payload still carries it', async () => {
      const viewer = await openPersona(browser, VIEWER);
      try {
        const sink = collectGraphQLBodies(viewer.page);
        await gotoAboutPage(viewer.page);
        await waitForGraphQLBody(sink, body =>
          body.includes('classifications')
        );
        // Positive control: the shown entry renders for the viewer, so the list has painted.
        await expect(aboutGroup(viewer.page, CONTROL)).toBeVisible({
          timeout: 20_000,
        });
        await expect(viewer.page.getByText(TPL)).toHaveCount(0);
        // FR-010d: the flag is render-only — the viewer's own API payload carries the entry.
        const carrying = sink.texts.filter(body =>
          body.includes('classifications')
        );
        expect(carrying.length).toBeGreaterThan(0);
        expect(
          carrying.some(body => body.includes(TPL)),
          'FR-010d: hidden entry still returned by the API for the viewer'
        ).toBe(true);
        assertConsoleClean(viewer.guard, 'SL-05 viewer (hidden)');
      } finally {
        await viewer.context.close();
      }
    });

    await test.step('FR-010d: an anonymous and a non-member API read return the hidden entry with display=false', async () => {
      const [stored] = await entryByLabel(TPL);
      for (const reader of [undefined, OUTSIDER]) {
        const res = await readEntries(fixture.spaceId, reader);
        expect(res.errors, `read as ${reader ?? 'anonymous'}`).toEqual([]);
        const hidden = res.data?.lookup.space.about.classifications.find(
          e => e.id === stored.id
        );
        expect(
          hidden,
          `hidden entry returned to ${reader ?? 'anonymous'}`
        ).toBeDefined();
        expect(hidden?.display).toBe(false);
        expect(hidden?.selectedValueIDs).toEqual([stored.values[0].id]);
      }
    });

    await test.step('toggle back ON: badge gone, persisted across reload', async () => {
      await gotoSettingsAbout(page);
      await toggleEntryDisplay(page, TPL);
      await expect(entryHiddenBadge(page, TPL)).toHaveCount(0);
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(entryKebab(page, TPL)).toBeVisible();
      await expect(entryHiddenBadge(page, TPL)).toHaveCount(0);
    });

    await test.step('viewer sees the group again, with its chip', async () => {
      const viewer = await openPersona(browser, VIEWER);
      try {
        await gotoAboutPage(viewer.page);
        const group = aboutGroup(viewer.page, TPL);
        await expect(group).toBeVisible({ timeout: 20_000 });
        await expect(group.getByRole('list').locator('li')).toHaveText([
          VALUES[0],
        ]);
        assertConsoleClean(viewer.guard, 'SL-05 viewer (shown)');
      } finally {
        await viewer.context.close();
      }
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-06                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-06 removal gate', () => {
  const TPL = 'e2e024 SL Removal';
  const KEEP = 'e2e024 SL Removal Keep';
  const VAL = 'e2e024 SL RemVal';

  test('SL-06 REM-AS1 — confirmation names the entry + no-undo, cancel is a no-op, confirm destroys only the target; template and other Spaces untouched (FR-014, FR-014b)', async ({
    page,
    consoleGuard,
  }) => {
    test.setTimeout(150_000);
    // The duplicate-retry seeding below provokes one intentional conflict.
    consoleGuard.allow.push(/already in use/i, /conflict/i, /duplicate/i);
    const template = await createTemplateApi(fixture, {
      name: TPL,
      values: [VAL],
    });
    // Another Space's copy of the same template: the subspace carries its own.
    const otherCopy = await addEntryApi(
      fixture.subspaceId as string,
      template.id
    );

    await test.step('seed: two entries (second via duplicate-retry)', async () => {
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      const dialog = await openPickerDialog(page);
      await pickerRow(page, dialog, TPL).click();
      const conflict = conflictDialog(page);
      await expect(conflict).toBeVisible();
      await conflict.getByLabel('Display label').fill(KEEP);
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await expect(conflict).not.toBeVisible();
      await expect(entryKebab(page, KEEP)).toBeVisible();
    });

    const target = entryCard(page, TPL);

    await test.step('guard real data: select the value on the target entry', async () => {
      await ensureEntrySelectorOpen(page, TPL);
      const saved = selectionSaved(page);
      await target.getByRole('checkbox', { name: VAL }).check();
      await expect(target.getByText('Multi-select · 1 selected')).toBeVisible();
      await saved;
    });

    await test.step('removal dialog names the entry, warns no-undo, does not commit on first click (FR-014b)', async () => {
      const menu = await openEntryMenu(page, TPL);
      await menu
        .getByRole('menuitem', { name: 'Remove classification' })
        .click();
      const confirm = removeConfirmDialog(page);
      await expect(confirm).toBeVisible();
      await expect(confirm).toContainText(
        `This removes "${TPL}" from this Space`
      );
      await expect(confirm).toContainText(/there is no undo/);
      // No first-click commit — the entry is still there behind the dialog.
      await expect(entryKebabDom(page, TPL)).toHaveCount(1);
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).not.toBeVisible();
    });

    await test.step('cancel is a no-op: both entries AND the live selection unchanged', async () => {
      await expect(entryKebab(page, TPL)).toHaveCount(1);
      await expect(entryKebab(page, KEEP)).toHaveCount(1);
      await expect(target.getByText('Multi-select · 1 selected')).toBeVisible();
      await expect(target.getByRole('checkbox', { name: VAL })).toBeChecked();
    });

    await test.step('the dialog also gates the 0-selected sibling ("even at 0 selected")', async () => {
      const menu = await openEntryMenu(page, KEEP);
      await menu
        .getByRole('menuitem', { name: 'Remove classification' })
        .click();
      const confirm = removeConfirmDialog(page);
      await expect(confirm).toBeVisible();
      await expect(confirm).toContainText(
        `This removes "${KEEP}" from this Space`
      );
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(confirm).not.toBeVisible();
      await expect(entryKebab(page, KEEP)).toHaveCount(1);
    });

    await test.step('confirm destroys exactly the target entry and its selection', async () => {
      const menu = await openEntryMenu(page, TPL);
      await menu
        .getByRole('menuitem', { name: 'Remove classification' })
        .click();
      const confirm = removeConfirmDialog(page);
      await expect(confirm).toBeVisible();
      await confirm
        .getByRole('button', { name: 'Remove', exact: true })
        .click();
      await expect(entryKebab(page, TPL)).toHaveCount(0);
      // Sibling untouched.
      await expect(entryKebab(page, KEEP)).toHaveCount(1);
      await expect(
        entryCard(page, KEEP).getByText('Multi-select · 0 selected')
      ).toBeVisible();
    });

    await test.step('source template still exists in the space library (FR-014)', async () => {
      await gotoTemplatesSettings(page);
      await ensureClassificationTemplatesSectionOpen(page);
      await expect(templatePreviewButton(page, TPL)).toBeVisible();
    });

    await test.step('reload: removal persisted, sibling still renders', async () => {
      await gotoSettingsAbout(page);
      await expect(entryKebab(page, KEEP)).toBeVisible();
      await expect(entryKebab(page, TPL)).toHaveCount(0);
    });

    await test.step('API: target gone, sibling intact, template and the other Space copy untouched', async () => {
      const labels = (await entriesOf(fixture.spaceId)).map(
        e => e.displayLabel
      );
      expect(labels).not.toContain(TPL);
      expect(labels).toContain(KEEP);
      const library = await libraryTemplates(fixture.templatesSetId);
      expect(
        library.find(t => t.id === template.id)?.classification?.values
      ).toEqual(template.classification?.values);
      const other = await entriesOf(fixture.subspaceId as string);
      expect(other.find(e => e.id === otherCopy.id)).toMatchObject({
        displayLabel: TPL,
        values: otherCopy.values,
      });
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-07                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-07 viewer authorization negative (UI)', () => {
  const TPL = 'e2e024 SL Viewer Control';
  const VAL = 'e2e024 SL Viewer V';

  test('SL-07 FR-014a (UI half) — a member gets no operable classification editor on any surface', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    test.info().annotations.push({
      type: 'note',
      description:
        'UI half only. The API half — every classification write denied with FORBIDDEN_POLICY for a ' +
        'member and a non-member — is server-api journey/space/space-classifications.it-spec.ts.',
    });
    // A shown entry with a value, so the viewer's About has a classification list to inspect.
    const template = await createTemplateApi(fixture, {
      name: TPL,
      values: [VAL],
    });
    const entry = await addEntryApi(fixture.spaceId, template.id);
    await gqlOk(
      `mutation ClassificationsViewerSelect($data: UpdateClassificationEntrySelectionInput!) {
        updateClassificationEntrySelection(classificationData: $data) { id }
      }`,
      {
        data: {
          classificationEntryID: entry.id,
          selectedValueIDs: [entry.values[0].id],
        },
      }
    );

    const viewer = await openPersona(browser, VIEWER);
    const { page } = viewer;
    try {
      await test.step('direct nav to /settings/about: no operable Classifications editor', async () => {
        const sink = collectGraphQLBodies(page);
        await page.goto(`${spaceUrl()}/settings/about`);
        // The SPA has issued at least one API round trip…
        await expect
          .poll(() => sink.texts.length, { timeout: 15_000 })
          .toBeGreaterThan(0);
        // …and settled on whichever enforcement shape rendered: a redirect away from settings,
        // or a rendered page (heading). Never a fixed wait.
        await expect
          .poll(
            async () =>
              !page.url().includes('/settings/about') ||
              (await page.getByRole('heading').count()) > 0,
            { timeout: 20_000 }
          )
          .toBe(true);
        await expect(
          page.getByRole('button', { name: 'Add Classification' })
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: /^Classification actions:/ })
        ).toHaveCount(0);
        await expect(
          page.locator(
            '#classifications [role="checkbox"], #classifications [role="radio"]'
          )
        ).toHaveCount(0);
      });

      await test.step("direct nav to /settings/templates: no classification 'Add new'", async () => {
        const sink = collectGraphQLBodies(page);
        await page.goto(`${spaceUrl()}/settings/templates`);
        await expect
          .poll(() => sink.texts.length, { timeout: 15_000 })
          .toBeGreaterThan(0);
        await expect
          .poll(
            async () =>
              !page.url().includes('/settings/templates') ||
              (await page
                .getByRole('textbox', { name: 'Search templates…' })
                .count()) > 0 ||
              (await page.getByRole('heading').count()) > 0,
            { timeout: 20_000 }
          )
          .toBe(true);
        await expect(
          classificationTemplatesTrigger(page)
            .locator('xpath=..')
            .getByRole('button', { name: 'Add new' })
        ).toHaveCount(0);
        await expect(
          page.getByRole('menuitem', { name: 'Create new' })
        ).toHaveCount(0);
      });

      await test.step('public About: the list renders for the viewer, with no add button, kebab or selector', async () => {
        const sink = collectGraphQLBodies(page);
        await gotoAboutPage(page);
        await waitForGraphQLBody(sink, body =>
          body.includes('classifications')
        );
        await expect(page.getByRole('heading').first()).toBeVisible({
          timeout: 20_000,
        });
        const list = aboutClassificationList(page);
        // Positive control: the viewer does see the classification list.
        await expect(aboutGroup(page, TPL)).toBeVisible({ timeout: 20_000 });
        await expect(list.getByRole('button')).toHaveCount(0);
        await expect(
          list.locator('[role="checkbox"], [role="radio"]')
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Add Classification' })
        ).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: /^Classification actions:/ })
        ).toHaveCount(0);
      });

      assertConsoleClean(viewer.guard, 'SL-07 viewer');
    } finally {
      await viewer.context.close();
    }
  });
});

/* ------------------------------------------------------------------ */
/* SL-08                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-08 subspace picker', () => {
  const TPL = 'e2e024 SL Sub Library';

  test('SL-08 US1-AS7 — a subspace is offered its top-level Space library and the entry attaches to the subspace itself (FR-007a, FR-008, FR-011a scope)', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await createTemplateApi(fixture, {
      name: TPL,
      values: ['e2e024 SL Sub V1', 'e2e024 SL Sub V2'],
    });
    const subspaceUrl = fixture.subspaceUrl as string;
    const subspaceId = fixture.subspaceId as string;

    await test.step("the subspace picker lists the L0 library's template under This Space's library", async () => {
      await gotoSettingsAbout(page, subspaceUrl);
      const dialog = await openPickerDialog(page);
      await expect(
        pickerGroup(dialog, SPACE_GROUP).getByText(TPL, { exact: true })
      ).toBeVisible();
      await pickerRow(page, dialog, TPL).click();
      await expect(dialog).not.toBeVisible({ timeout: 20_000 });
      await expect(entryKebab(page, TPL)).toBeVisible({ timeout: 20_000 });
    });

    await test.step('the entry is on the subspace, not on its parent', async () => {
      expect((await entriesOf(subspaceId)).map(e => e.displayLabel)).toContain(
        TPL
      );
      expect(
        (await entriesOf(fixture.spaceId)).map(e => e.displayLabel)
      ).not.toContain(TPL);
    });

    await test.step('the duplicate guard is scoped to the subspace: the parent may carry the same label', async () => {
      const template = (await libraryTemplates(fixture.templatesSetId)).find(
        t => t.profile.displayName === TPL
      );
      expect(template).toBeDefined();
      const parentCopy = await addEntryApi(
        fixture.spaceId,
        template?.id as string
      );
      expect(parentCopy.displayLabel).toBe(TPL);
    });
  });
});
