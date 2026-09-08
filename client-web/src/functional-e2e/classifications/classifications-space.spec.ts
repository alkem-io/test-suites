// spec: workspace#024-classifications — acceptance-walk suite "space-lifecycle"
//
// Space-side lifecycle of Classifications on the live shared dev stack
// (Default Space /eco1): add → select → duplicate guard → single-select
// cardinality → About-page display → show/hide toggle → removal → viewer
// authorization negatives.
//
// STATE SAFETY: every artifact this file creates is prefixed 'e2e024 SL'.
// Each scenario removes its own artifacts in afterAll (best-effort, prefix/
// exact-label matched) and a file-level leak detector sweeps both editor
// surfaces at the end, failing loudly if anything was left behind. The
// seeded SDGs template, the user's pre-existing SDGs/'UN Goals' entries and
// the Space Tags are never touched. The viewer persona performs zero writes.
//
// Run (from client-web/):
//   pnpm run test:classifications
// (config/playwright.config.classifications.ts — single worker, enforced; the
// default config ignores this directory. The file additionally pins
// mode:'default' below so its tests can never shard across workers.)

import { test as base, expect, type Page } from '@playwright/test';
import { ensurePersonaState } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import {
  BASE_URL,
  SPACE_NAME_ID,
  EDITOR_EMAIL,
  ConsoleGuard,
  aboutClassificationList,
  aboutGroup,
  addTemplateToSpace,
  assertConsoleClean,
  attachConsoleGuard,
  classificationsSection,
  classificationTemplatesTrigger,
  collectGraphQLBodies,
  conflictDialog,
  createClassificationTemplate,
  deleteClassificationTemplateIfPresent,
  ensureClassificationTemplatesSectionOpen,
  ensureEntrySelectorOpen,
  ensureEntryShown,
  ensureViewerState,
  entryCard,
  entryChips,
  entryHiddenBadge,
  entryKebab,
  entryKebabDom,
  gotoAboutPage,
  gotoSettingsAbout,
  gotoTemplatesSettings,
  newEditorPage,
  newViewerPage,
  openEntryMenu,
  openPickerDialog,
  pickerRow,
  pickerSpaceLibraryGroup,
  removeConfirmDialog,
  removeEntryIfPresent,
  sweepSuiteArtifacts,
  templatePreviewButton,
  toggleEntryDisplay,
  waitForGraphQLBody,
} from './space-lifecycle.helpers';

/**
 * Editor-authenticated test with the shared per-run persona session, the CRD
 * flag pinned, and the adjudicated console guard attached to every default
 * page (asserted on teardown; allowlist-filtered, classification/GraphQL
 * relevance only). Viewer pages are created per-scenario via newViewerPage.
 */
const test = base.extend<{ consoleGuard: ConsoleGuard }>({
  storageState: async ({ browser }, use) => {
    await use(await ensurePersonaState(browser, EDITOR_EMAIL));
  },
  context: async ({ context }, use) => {
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('alkemio-crd-enabled', 'true');
      } catch {
        /* storage unavailable — the persisted session flag still applies */
      }
    });
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

// Opt this file out of fullyParallel: all of its tests run in declaration
// order on ONE worker (without serial-mode's abort-remaining-on-failure), so
// the file-level afterAll leak sweep runs exactly once, after every scenario —
// never per-worker while sibling tests are still creating artifacts.
test.describe.configure({ mode: 'default' });

// Session warmup (mirrors the sibling templates suite): the cold first login
// for a persona otherwise runs lazily — the editor's inside the FIRST test's
// storageState fixture setup, under the config's DEFAULT 30s timeout
// (config/playwright.config.classifications.ts), which an in-body
// test.setTimeout() cannot protect; the viewer's mid-test via newViewerPage,
// burning SL-04's budget. On the loaded live stack one cold login alone has
// been observed to exceed 30s. A beforeAll hook owns its own timeout, so both
// real logins happen here with a realistic budget; every test then loads the
// cached session state from disk.
test.beforeAll(async ({ browser }) => {
  test.setTimeout(240_000);
  await ensurePersonaState(browser, EDITOR_EMAIL);
  await ensureViewerState(browser);
});

/**
 * Arm a waiter for the NEXT successful GraphQL response of the given
 * operation. Register BEFORE triggering the mutation, await before any
 * navigation/reload: the 024 selection UI applies writes optimistically
 * (classificationSelectionOverrides), so a DOM assertion alone can pass while
 * the server write is still in flight — and a reload then races it.
 */
function operationResponse(page: Page, operationName: string) {
  return page.waitForResponse(response => {
    if (!response.url().includes('graphql') || !response.ok()) return false;
    try {
      return response.request().postDataJSON()?.operationName === operationName;
    } catch {
      return false;
    }
  });
}

/** The selection-write mutation the entry checkboxes/radios/chips commit through. */
const selectionSaved = (page: Page) =>
  operationResponse(page, 'UpdateClassificationEntrySelection');

/* ------------------------------------------------------------------ */
/* File-level leak detector (runs after every scenario's own cleanup)  */
/* ------------------------------------------------------------------ */

test.afterAll(async ({ browser }) => {
  test.setTimeout(300_000);
  const editor = await newEditorPage(browser);
  try {
    const leaked = await sweepSuiteArtifacts(editor.page);
    if (leaked.length > 0) {
      throw new Error(
        `Leak detector: 'e2e024 SL' artifacts survived their scenario cleanup (best-effort deleted by the sweep just now): ${leaked.join('; ')}`
      );
    }
  } finally {
    await editor.context.close();
  }
});

/* ------------------------------------------------------------------ */
/* SL-01                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-01 add + select roundtrip (S2+S3)', () => {
  const TPL = 'e2e024 SL Roundtrip';
  const V1 = 'e2e024 SL One';
  const V2 = 'e2e024 SL Two';
  const V3 = 'e2e024 SL Three';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      await removeEntryIfPresent(editor.page, TPL).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-01 immediate commit, authored order, persistence, sibling-safe deselect (FR-006a/002b/012a/012d)', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    await test.step('create the space-library template', async () => {
      await createClassificationTemplate(page, {
        name: TPL,
        cardinality: 'MULTI_SELECT',
        values: [V1, V2, V3],
      });
    });

    const card = entryCard(page, TPL);

    await test.step('pick it from "This Space\'s library"', async () => {
      await gotoSettingsAbout(page);
      const dialog = await openPickerDialog(page);
      await expect(
        pickerSpaceLibraryGroup(dialog).getByText(TPL, { exact: true })
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
      // FR-012a — the selector auto-expands; polled, never an immediate read.
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
      await card.getByRole('checkbox', { name: V3 }).check();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await card.getByRole('checkbox', { name: V1 }).check();
      await expect(card.getByText('Multi-select · 2 selected')).toBeVisible();
      // Chips render below the checkbox list, in authored order regardless of
      // click order (FR-002b).
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

    await test.step('chip × removes only its own value; the sibling survives a reload (FR-012d)', async () => {
      // Server-ack barrier: the deselect renders optimistically, so wait for
      // the mutation response before reloading — otherwise the reload can
      // abort the in-flight write and the persistence check goes coin-flip.
      const saved = selectionSaved(page);
      await card.getByRole('button', { name: `Deselect ${V1}` }).click();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V3]);
      await saved;
      // Mandatory server-side check: an optimistic client render must not mask
      // a full-replacement write having clobbered the sibling.
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
      await expect(entryChips(page, TPL).locator('li')).toHaveText([V3]);
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
      // Server-ack barrier before the reload (optimistic render — see above).
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

    // Note: the "no layout shift while ticking" claim is deliberately NOT
    // asserted (bounding-box checks are a flake factory — visual-QA concern).
  });
});

/* ------------------------------------------------------------------ */
/* SL-02                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-02 duplicate guard (S4)', () => {
  const TPL = 'e2e024 SL Dup';
  const ALIAS = 'e2e024 SL Dup Two';
  const VALUES = ['e2e024 SL Dup V1', 'e2e024 SL Dup V2'];

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      // A regressed FR-011c guard would have accepted the lowercase probe as a
      // real entry — remove the known variant explicitly (the file-level sweep
      // is case-insensitive too, but this targeted pass survives sweep hiccups).
      await removeEntryIfPresent(editor.page, 'e2e024 sl dup').catch(() => {});
      await removeEntryIfPresent(editor.page, ALIAS).catch(() => {});
      await removeEntryIfPresent(editor.page, TPL).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-02 server-side conflict dialog, pre-seeded retry, case/whitespace variants, alias persistence (FR-011a/b/c, FR-018b)', async ({
    page,
    consoleGuard,
  }) => {
    test.setTimeout(300_000);
    // This scenario intentionally provokes server-side conflicts; those
    // responses may surface as console errors and must not fail the guard.
    consoleGuard.allow.push(/already in use/i, /conflict/i, /duplicate/i);

    await test.step('seed: template + first entry (0 selected)', async () => {
      await createClassificationTemplate(page, {
        name: TPL,
        cardinality: 'MULTI_SELECT',
        values: VALUES,
      });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      await expect(
        entryCard(page, TPL).getByText('Multi-select · 0 selected')
      ).toBeVisible();
    });

    const conflict = conflictDialog(page);

    await test.step('second pick raises the server conflict dialog, pre-seeded (FR-011a/b)', async () => {
      const dialog = await openPickerDialog(page);
      // Server roundtrip barrier (same pattern as the whitespace variant
      // below): the step claims a SERVER-side conflict, and 'dialog appeared +
      // still one entry' alone would pass identically under a purely
      // client-side duplicate check. Anchoring on the
      // AddClassificationEntryFromTemplate response proves the duplicate pick
      // actually round-tripped and the server, not the client, rejected it.
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
      // Retry field arrives pre-seeded with the conflicting label.
      await expect(conflict.getByLabel('Display label')).toHaveValue(TPL);
      // Not a silent no-op: still exactly one entry. DOM-level lookup — the
      // modal aria-hides the page behind it, so the role query would see 0.
      await expect(entryKebabDom(page, TPL)).toHaveCount(1);
    });

    await test.step('case variant conflicts too (FR-011c)', async () => {
      await conflict.getByLabel('Display label').fill('e2e024 sl dup');
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await expect(conflict).toBeVisible();
      await expect(
        conflict.getByText(/labelled "e2e024 sl dup"/)
      ).toBeVisible();
      await expect(entryKebabDom(page, TPL)).toHaveCount(1);
    });

    await test.step('whitespace variant: server trim-then-conflict, no second entry (FR-011c)', async () => {
      test.info().annotations.push({
        type: 'note',
        description:
          'FR-011c whitespace variant: the client retry path performs no trim (the ' +
          'label travels raw through ClassificationPickerDialog → useAboutTabData), ' +
          'so the only acceptable pass is a server-side trim-then-conflict — the ' +
          'dialog stays open and no second entry is created.',
      });
      await conflict.getByLabel('Display label').fill(`${TPL} `);
      // Anchor on the server roundtrip: the conflict dialog is ALREADY visible
      // from the previous attempt, so without this the assertions below would
      // pass instantly against the pre-response DOM and a regression that
      // accepts the whitespace variant would sail through.
      const attempted = operationResponse(
        page,
        'AddClassificationEntryFromTemplate'
      );
      await conflict
        .getByRole('button', { name: 'Add with this label' })
        .click();
      await attempted;
      await expect(conflict).toBeVisible();
      // Prefix-scoped DOM count: catches BOTH a raw trailing-space entry and a
      // server-trimmed duplicate. Attribute selector, not getByRole — it sees
      // through the modal's aria-hidden, and accessible-name computation would
      // whitespace-normalize the trailing space away.
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
      // Same vocabulary, authored order (the 0-selected entry auto-opens).
      await expect(aliasCard.locator('fieldset label')).toHaveText(VALUES);
      // Addition order: alias renders AFTER the original.
      const ours = (
        await classificationsSection(page)
          .getByRole('heading', { level: 4 })
          .allTextContents()
      )
        .map(text => text.trim())
        .filter(text => text.startsWith(TPL));
      expect(ours).toEqual([TPL, ALIAS]);
    });

    await test.step('reload: both entries persist, in order, original casing intact', async () => {
      await page.reload();
      await expect(classificationsSection(page)).toBeVisible({
        timeout: 20_000,
      });
      // Exact-name kebab matches prove the stored labels kept the author's casing.
      await expect(entryKebab(page, TPL)).toHaveCount(1);
      await expect(entryKebab(page, ALIAS)).toHaveCount(1);
      const ours = (
        await classificationsSection(page)
          .getByRole('heading', { level: 4 })
          .allTextContents()
      )
        .map(text => text.trim())
        .filter(text => text.startsWith(TPL));
      expect(ours).toEqual([TPL, ALIAS]);
      await expect(
        entryCard(page, TPL).getByText('Multi-select · 0 selected')
      ).toBeVisible();
    });
  });
});

/* ------------------------------------------------------------------ */
/* SL-03                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-03 single-select cardinality (S7 + S9 single-select display)', () => {
  const TPL = 'e2e024 SL Single';
  const RED = 'e2e024 SL Red';
  const GREEN = 'e2e024 SL Green';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      await removeEntryIfPresent(editor.page, TPL).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-03 radio semantics, replace-not-add, one-chip About display (FR-012)', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    test.info().annotations.push({
      type: 'deviation',
      description:
        'The 024 UI renders ARIA radios (Radix button[role=radio]), not native ' +
        'input[type=radio]; the input-level checked-count probe therefore uses ' +
        'getByRole("radio", { checked: true }) which reads aria-checked — the same ' +
        'input-level evidence the plan asks for.',
    });

    await test.step('create the single-select template', async () => {
      await createClassificationTemplate(page, {
        name: TPL,
        cardinality: 'SINGLE_SELECT',
        values: [RED, GREEN],
      });
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
      // Server-ack barrier: serialize the Red write before Green's, so the
      // Green barrier below can never be satisfied by a late Red response.
      const saved = selectionSaved(page);
      await card.getByRole('radio', { name: RED }).check();
      await expect(card.getByText('Single-select · 1 selected')).toBeVisible();
      await expect(card.getByRole('radio', { checked: true })).toHaveCount(1);
      await expect(card.getByRole('radio', { name: RED })).toBeChecked();
      await saved;
    });

    await test.step('pick Green: replaces Red, never appends', async () => {
      // Server-ack barrier before the reload step (optimistic render).
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
    });

    await test.step('public About: the group renders exactly one chip (S9 single-select)', async () => {
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

test.describe('SL-04 About-page display (S9)', () => {
  const TPL_A = 'e2e024 SL Disp A';
  const TPL_B = 'e2e024 SL Disp B';
  const A_VALUES = ['e2e024 SL DispA V1', 'e2e024 SL DispA V2'];
  const B_VALUES = ['e2e024 SL DispB V1', 'e2e024 SL DispB V2'];

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      await removeEntryIfPresent(editor.page, TPL_A).catch(() => {});
      await removeEntryIfPresent(editor.page, TPL_B).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL_A).catch(
        () => {}
      );
      await deleteClassificationTemplateIfPresent(editor.page, TPL_B).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-04 labelled groups, editor-only empty group, addition order, Tags untouched, viewer read-only (FR-018b/c, FR-013)', async ({
    page,
    browser,
  }) => {
    test.setTimeout(300_000);

    await test.step('seed: two separate templates (never the duplicate-retry route)', async () => {
      await createClassificationTemplate(page, {
        name: TPL_A,
        cardinality: 'MULTI_SELECT',
        values: A_VALUES,
      });
      await createClassificationTemplate(page, {
        name: TPL_B,
        cardinality: 'MULTI_SELECT',
        values: B_VALUES,
      });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL_A);
      await addTemplateToSpace(page, TPL_B);
      const cardA = entryCard(page, TPL_A);
      await ensureEntrySelectorOpen(page, TPL_A);
      // Server-ack barriers on both writes: the render is optimistic, and the
      // About navigation right after would otherwise race the in-flight
      // mutation — making every later chip assertion a coin flip.
      const firstSaved = selectionSaved(page);
      await cardA.getByRole('checkbox', { name: A_VALUES[0] }).check();
      await firstSaved;
      const secondSaved = selectionSaved(page);
      await cardA.getByRole('checkbox', { name: A_VALUES[1] }).check();
      await expect(cardA.getByText('Multi-select · 2 selected')).toBeVisible();
      await secondSaved;
      // Disp B stays at 0 selected on purpose (FR-018c).
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

      // Addition order between OUR groups only — pre-existing SDGs/'UN Goals'
      // groups around them are tolerated, never asserted on.
      const ours = (
        await list.getByRole('heading', { level: 3 }).allTextContents()
      )
        .map(text => text.trim())
        .filter(text => text.startsWith('e2e024 SL Disp'));
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
      // The suite does not own these strings — soft only.
      expect
        .soft(await tags.textContent(), 'Tags still hold "innovation"')
        .toContain('innovation');
      expect
        .soft(await tags.textContent(), 'Tags still hold "sustainability"')
        .toContain('sustainability');
    });

    await test.step('viewer: chips visible, empty group absent, zero edit affordances', async () => {
      const viewer = await newViewerPage(browser);
      try {
        await gotoAboutPage(viewer.page);
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
  });
});

/* ------------------------------------------------------------------ */
/* SL-05                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-05 show/hide toggle (S8)', () => {
  const TPL = 'e2e024 SL Hidden';
  const VALUES = ['e2e024 SL Hid V1', 'e2e024 SL Hid V2'];

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      // Idempotent: force the toggle ON whether the test died hidden or shown…
      await gotoSettingsAbout(editor.page)
        .then(() => ensureEntryShown(editor.page, TPL))
        .catch(() => {});
      // …then remove the entry and its template.
      await removeEntryIfPresent(editor.page, TPL).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-05 settings persistence checkpoint, editor badge vs viewer absence, reversible, FR-010d soft probe (FR-010b/d, FR-018d)', async ({
    page,
    browser,
  }) => {
    test.setTimeout(300_000);

    await test.step('seed: template + entry with one selected value', async () => {
      await createClassificationTemplate(page, {
        name: TPL,
        cardinality: 'MULTI_SELECT',
        values: VALUES,
      });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      const card = entryCard(page, TPL);
      await card.getByRole('checkbox', { name: VALUES[0] }).check();
      await expect(card.getByText('Multi-select · 1 selected')).toBeVisible();
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
      // Persistence checkpoint — separates a persistence defect from a
      // visibility defect before anyone else looks.
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

    await test.step('viewer: hidden group absent from the render; FR-010d soft API probe', async () => {
      const viewer = await newViewerPage(browser);
      try {
        const sink = collectGraphQLBodies(viewer.page);
        await gotoAboutPage(viewer.page);
        // Settle on the payload that carries classifications so the negative
        // below cannot false-pass against a not-yet-rendered page.
        await waitForGraphQLBody(sink, body =>
          body.includes('classifications')
        );
        await expect(viewer.page.getByText(TPL)).toHaveCount(0);

        // FR-010d: the flag is render-only, not an authz filter — the hidden
        // entry should still travel in the API payload the viewer received.
        const carrying = sink.texts.filter(body =>
          body.includes('classifications')
        );
        if (carrying.length === 0) {
          test.info().annotations.push({
            type: 'note',
            description:
              'FR-010d probe skipped: no GraphQL response carrying classifications was observed.',
          });
        } else {
          expect
            .soft(
              carrying.some(body => body.includes(TPL)),
              'FR-010d: hidden entry still returned by the API for the viewer (render-only flag, not an authz filter)'
            )
            .toBe(true);
        }
        assertConsoleClean(viewer.guard, 'SL-05 viewer (hidden)');
      } finally {
        await viewer.context.close();
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
      const viewer = await newViewerPage(browser);
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

test.describe('SL-06 removal gate (S10)', () => {
  const TPL = 'e2e024 SL Removal';
  const KEEP = 'e2e024 SL Removal Keep';
  const VAL = 'e2e024 SL RemVal';

  test.afterAll(async ({ browser }) => {
    test.setTimeout(240_000);
    const editor = await newEditorPage(browser);
    try {
      await removeEntryIfPresent(editor.page, TPL).catch(() => {});
      await removeEntryIfPresent(editor.page, KEEP).catch(() => {});
      await deleteClassificationTemplateIfPresent(editor.page, TPL).catch(
        () => {}
      );
    } finally {
      await editor.context.close();
    }
  });

  test('SL-06 confirmation names the entry + no-undo, cancel is a no-op with live selection, confirm destroys only the target (FR-014, FR-014b)', async ({
    page,
    consoleGuard,
  }) => {
    test.setTimeout(300_000);
    // The duplicate-retry seeding below provokes one intentional conflict.
    consoleGuard.allow.push(/already in use/i, /conflict/i, /duplicate/i);

    await test.step('seed: template + two entries (second via duplicate-retry)', async () => {
      await createClassificationTemplate(page, {
        name: TPL,
        cardinality: 'MULTI_SELECT',
        values: [VAL],
      });
      await gotoSettingsAbout(page);
      await addTemplateToSpace(page, TPL);
      // Acceptable coupling: the retry dialog is this scenario's own
      // subject-adjacent machinery; SL-02 owns its full contract.
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
      await target.getByRole('checkbox', { name: VAL }).check();
      await expect(target.getByText('Multi-select · 1 selected')).toBeVisible();
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
      // DOM-level lookup: the modal aria-hides the page, so a role-based
      // visibility probe would resolve to 0 elements regardless.
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
  });
});

/* ------------------------------------------------------------------ */
/* SL-07                                                               */
/* ------------------------------------------------------------------ */

test.describe('SL-07 viewer authorization negative (read-only, zero cleanup)', () => {
  test('SL-07 direct navigation to editor surfaces is denied or read-only; no write affordances anywhere', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    test.info().annotations.push({
      type: 'note',
      description:
        'Strictly read-only: the walker persona performs zero writes and this ' +
        'scenario creates no artifacts, so there is nothing to clean up. The ' +
        'assertions accept either enforcement shape (route denial/redirect OR ' +
        'affordance-stripped render) and only require the absence of write affordances.',
    });

    const viewer = await newViewerPage(browser);
    const { page } = viewer;
    try {
      await test.step('direct nav to /settings/about: no operable Classifications editor', async () => {
        const sink = collectGraphQLBodies(page);
        await page.goto(`${BASE_URL}/${SPACE_NAME_ID}/settings/about`);
        await page.waitForLoadState('load');
        // Settle: the SPA has issued at least one API roundtrip, plus a beat to
        // render whichever guard shape it takes (negative-only surface, so a
        // positive anchor is impossible by design).
        await expect
          .poll(() => sink.texts.length, { timeout: 15_000 })
          .toBeGreaterThan(0);
        await page.waitForTimeout(1500);
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
        // Fresh sink per navigation: settle on a real API roundtrip, then on a
        // positive landmark of whichever enforcement shape rendered — a bare
        // fixed wait could run the negatives against a still-blank page (and a
        // denied redirect would then pass vacuously).
        const sink = collectGraphQLBodies(page);
        await page.goto(`${BASE_URL}/${SPACE_NAME_ID}/settings/templates`);
        await page.waitForLoadState('load');
        await expect
          .poll(() => sink.texts.length, { timeout: 15_000 })
          .toBeGreaterThan(0);
        // Enforcement shapes: (a) redirect away from the settings route,
        // (b) the templates surface rendered read-only, or (c) a denial view —
        // each yields either a URL change or rendered heading content.
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
        const trigger = classificationTemplatesTrigger(page);
        if ((await trigger.count()) > 0) {
          // Section renders read-only: its header must carry no Add new menu.
          await expect(
            trigger.locator('xpath=..').getByRole('button', { name: 'Add new' })
          ).toHaveCount(0);
        }
        await expect(
          page.getByRole('menuitem', { name: 'Create new' })
        ).toHaveCount(0);
      });

      await test.step('public About: no add button, kebab, or interactive selector', async () => {
        // Fresh sink per navigation; settle on the payload that carries
        // classifications (the same barrier SL-05's viewer step uses) plus a
        // rendered landmark, so the negatives can never run against a blank or
        // still-hydrating page.
        const sink = collectGraphQLBodies(page);
        await gotoAboutPage(page);
        await waitForGraphQLBody(sink, body =>
          body.includes('classifications')
        );
        await expect(page.getByRole('heading').first()).toBeVisible({
          timeout: 20_000,
        });
        const list = aboutClassificationList(page);
        if ((await list.count()) > 0) {
          await expect(list.getByRole('button')).toHaveCount(0);
          await expect(
            list.locator('[role="checkbox"], [role="radio"]')
          ).toHaveCount(0);
        }
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
