/**
 * Suite-local helpers for the "space-lifecycle" classifications suite
 * (classifications-space.spec.ts). Owned by that spec ONLY — the sibling
 * templates-library suite must not import from here. (The one shared piece,
 * the console guard, lives in ./console-guard.ts and is re-exported below.)
 *
 * All artifact names created through these helpers carry the 'e2e024 SL'
 * prefix; every lookup is prefix- or exact-label-scoped so the suite can
 * never touch pre-existing state (the seeded SDGs template, the user's
 * SDGs/'UN Goals' entries, the Space Tags).
 *
 * Locator strategy is role/label-based against the real 024 CRD UI
 * (client-web feat/024-classifications):
 * - Entry kebab:            aria-label "Classification actions: <label>"
 * - Entry meta line:        "Multi-select · N selected" / "Single-select · N selected"
 * - Chip deselect:          aria-label "Deselect <value label>"
 * - Picker dialog:          "Add a classification"; conflict dialog "That name is already in use"
 * - Removal confirm:        alertdialog "Remove this classification?"
 * - Template card preview:  aria-label "Preview: <name>"; card kebab "Template actions"
 * - Template delete:        alertdialog "Delete template?" → button "Delete template"
 */

import {
  Browser,
  BrowserContext,
  expect,
  Locator,
  Page,
} from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '@src/functional-e2e/space/pages';
import { ensurePersonaState } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { attachConsoleGuard, type ConsoleGuard } from './console-guard';

// Re-export the SHARED guard (./console-guard.ts) so the spec keeps a single
// import surface; the templates-library suite imports ./console-guard directly.
export { attachConsoleGuard, assertConsoleClean } from './console-guard';
export type { ConsoleGuard } from './console-guard';

export const BASE_URL = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const SPACE_NAME_ID = 'eco1';
export const SL_PREFIX = 'e2e024 SL';

export const EDITOR_EMAIL = 'admin@alkem.io';
export const VIEWER_EMAIL = 'walker@alkem.io';
/** The viewer persona has its own password — the shared fixture's env-driven
 *  default (AUTH_TEST_HARNESS_PASSWORD) only fits the editor persona. */
export const VIEWER_PASSWORD = 'WalkMe2026!';

/* ------------------------------------------------------------------ */
/* Personas                                                            */
/* ------------------------------------------------------------------ */

const viewerStatePath = path.join(
  process.cwd(),
  '.auth',
  // Matches global-setup's `persona.*.json` stale-state cleanup glob, but is
  // suite-namespaced (sl-) so it can never collide with the shared fixture's
  // own `persona.walker-alkem-io.json` if another suite logs walker in too.
  'persona.sl-walker-alkem-io.json'
);

/**
 * Log the viewer persona (walker@alkem.io) in at most once per run and persist
 * its Kratos session, mirroring the shared fixture's ensurePersonaState but
 * with the viewer's own password.
 */
export async function ensureViewerState(browser: Browser): Promise<string> {
  if (fs.existsSync(viewerStatePath)) return viewerStatePath;
  await fs.promises.mkdir(path.dirname(viewerStatePath), { recursive: true });

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const context = await browser.newContext({ storageState: undefined });
    // Atomic write (mirrors authenticated-session.fixture): write to a
    // pid+attempt-unique temp path, then rename into place, so a concurrent
    // worker's existsSync gate can never observe (and load) a half-written
    // JSON file. The `.tmp` suffix matches neither the existsSync gate above
    // nor global-setup's `persona.*.json` stale-state glob.
    const tmpPath = `${viewerStatePath}.${process.pid}.${attempt}.tmp`;
    try {
      const page = await context.newPage();
      const loginPage = new LoginPage(page, BASE_URL);
      await loginPage.login(VIEWER_EMAIL, VIEWER_PASSWORD);
      await context.storageState({ path: tmpPath });
      await fs.promises.rename(tmpPath, viewerStatePath);
      await context.close();
      return viewerStatePath;
    } catch (error) {
      lastError = error;
      await context.close().catch(() => {});
      await fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
  throw new Error(
    `[sl-auth] could not establish a session for ${VIEWER_EMAIL} after ${maxAttempts} attempts: ${
      (lastError as Error)?.message ?? lastError
    }`
  );
}

async function newPersonaPage(
  browser: Browser,
  statePath: string
): Promise<{ context: BrowserContext; page: Page; guard: ConsoleGuard }> {
  const context = await browser.newContext({ storageState: statePath });
  // The CRD redesign is flag-gated; the persisted session normally carries the
  // flag already (the login flow opts into the new design), this is belt and
  // braces so a stale session can never land the suite on the legacy UI.
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem('alkemio-crd-enabled', 'true');
    } catch {
      /* storage unavailable — the persisted session flag still applies */
    }
  });
  const page = await context.newPage();
  const guard = attachConsoleGuard(page);
  return { context, page, guard };
}

/** A fresh editor-authenticated context+page (for hooks and cleanup passes). */
export async function newEditorPage(browser: Browser) {
  return newPersonaPage(
    browser,
    await ensurePersonaState(browser, EDITOR_EMAIL)
  );
}

/** A fresh viewer-authenticated (walker) context+page. Zero-writes persona. */
export async function newViewerPage(browser: Browser) {
  return newPersonaPage(browser, await ensureViewerState(browser));
}

/* ------------------------------------------------------------------ */
/* Hydration-safe counting (cleanup + leak-sweep gates)                */
/* ------------------------------------------------------------------ */

/**
 * Sample the locator's count until two consecutive reads (sampleGapMs apart)
 * agree, then return that settled count. Cleanup helpers and the leak sweep
 * gate on counts taken right after a navigation anchor — if the entry/card
 * list hydrates AFTER the anchor, an instant read returns 0, cleanup silently
 * no-ops AND the leak detector reports a false clean. Two agreeing samples
 * make an empty read mean "empty", not "not loaded yet".
 */
export async function stableLocatorCount(
  locator: Locator,
  { sampleGapMs = 1_000, timeoutMs = 10_000 } = {}
): Promise<number> {
  let previous = await locator.count();
  const deadline = Date.now() + timeoutMs;
  do {
    await locator.page().waitForTimeout(sampleGapMs);
    const current = await locator.count();
    if (current === previous) return current;
    previous = current;
  } while (Date.now() < deadline);
  return previous;
}

/* ------------------------------------------------------------------ */
/* GraphQL response sink (SPA settle + the FR-010d soft probe)         */
/* ------------------------------------------------------------------ */

export interface GraphQLSink {
  texts: string[];
}

/**
 * Collects the bodies of every GraphQL response the page receives. Used both
 * to know the About surface's data has actually arrived before a negative
 * assertion, and for the FR-010d render-only-flag soft probe in SL-05.
 */
export function collectGraphQLBodies(page: Page): GraphQLSink {
  const sink: GraphQLSink = { texts: [] };
  page.on('response', response => {
    if (!response.url().includes('graphql')) return;
    response
      .text()
      .then(text => {
        sink.texts.push(text);
      })
      .catch(() => {
        /* response body unavailable (navigation) — skip */
      });
  });
  return sink;
}

/** Poll until at least one GraphQL response body satisfies the predicate. */
export async function waitForGraphQLBody(
  sink: GraphQLSink,
  predicate: (body: string) => boolean,
  timeout = 20_000
) {
  await expect.poll(() => sink.texts.some(predicate), { timeout }).toBe(true);
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export async function gotoSettingsAbout(page: Page) {
  await page.goto(`${BASE_URL}/${SPACE_NAME_ID}/settings/about`);
  await expect(classificationsSection(page)).toBeVisible({ timeout: 20_000 });
}

export async function gotoTemplatesSettings(page: Page) {
  await page.goto(`${BASE_URL}/${SPACE_NAME_ID}/settings/templates`);
  await expect(
    page.getByRole('textbox', { name: 'Search templates…' })
  ).toBeVisible({ timeout: 20_000 });
}

/** Public About surface. Callers settle on their own anchors (or a GraphQL sink). */
export async function gotoAboutPage(page: Page) {
  await page.goto(`${BASE_URL}/${SPACE_NAME_ID}/about`);
  await page.waitForLoadState('domcontentloaded');
}

/* ------------------------------------------------------------------ */
/* Settings → About: Classifications section + entry cards             */
/* ------------------------------------------------------------------ */

/** The Classifications FieldSection anchor on /settings/about. */
export function classificationsSection(page: Page): Locator {
  return page.locator('#classifications');
}

export function entryKebab(page: Page, label: string): Locator {
  return page.getByRole('button', {
    name: `Classification actions: ${label}`,
    exact: true,
  });
}

/**
 * DOM-level kebab lookup for counting entries WHILE a modal dialog is open:
 * the modal aria-hides the page behind it, so the role-based locator above
 * resolves to 0 elements even though the entry card is still in the DOM.
 * Attribute-matched, so it sees through aria-hidden without weakening the
 * exact-label scoping.
 */
export function entryKebabDom(page: Page, label: string): Locator {
  return page.locator(`button[aria-label="Classification actions: ${label}"]`);
}

/**
 * The entry card root. The kebab button is a direct child of the card's header
 * row, which is a direct child of the card root (ClassificationEntryCard).
 */
export function entryCard(page: Page, label: string): Locator {
  return entryKebab(page, label).locator('xpath=../..');
}

/** The chips list inside an entry card (the only role=list in the card). */
export function entryChips(page: Page, label: string): Locator {
  return entryCard(page, label).getByRole('list');
}

export function entryHiddenBadge(page: Page, label: string): Locator {
  return entryCard(page, label).getByText('Not shown on the Space page');
}

export async function openEntryMenu(
  page: Page,
  label: string
): Promise<Locator> {
  await entryKebab(page, label).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

/** Toggle the "Show on the Space page" switch via the kebab menu (FR-010b). */
export async function toggleEntryDisplay(page: Page, label: string) {
  const menu = await openEntryMenu(page, label);
  // The switch row prevents the default menu close so the menu stays open —
  // dismiss it explicitly once the toggle has been clicked.
  await menu.getByRole('menuitem', { name: 'Show on the Space page' }).click();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
}

/** Idempotent: make sure the entry's show-toggle is ON (badge absent). */
export async function ensureEntryShown(page: Page, label: string) {
  if ((await entryKebab(page, label).count()) === 0) return;
  if ((await entryHiddenBadge(page, label).count()) > 0) {
    await toggleEntryDisplay(page, label);
    await expect(entryHiddenBadge(page, label)).toHaveCount(0);
  }
}

/** Expand the entry's value selector if it is currently collapsed. */
export async function ensureEntrySelectorOpen(page: Page, label: string) {
  const card = entryCard(page, label);
  const inputs = card.locator('[role="checkbox"], [role="radio"]');
  if ((await inputs.count()) > 0) return;
  const menu = await openEntryMenu(page, label);
  await menu.getByRole('menuitem', { name: 'Select values…' }).click();
  await expect(inputs.first()).toBeVisible();
}

/* ------------------------------------------------------------------ */
/* Step A picker                                                       */
/* ------------------------------------------------------------------ */

export async function openPickerDialog(page: Page): Promise<Locator> {
  await classificationsSection(page)
    .getByRole('button', { name: 'Add Classification' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add a classification' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** A picker row button, matched by the template's exact display label. */
export function pickerRow(
  page: Page,
  dialog: Locator,
  templateName: string
): Locator {
  return dialog
    .getByRole('button')
    .filter({ has: page.getByText(templateName, { exact: true }) });
}

/** The "This Space's library (n)" group container inside the picker. */
export function pickerSpaceLibraryGroup(dialog: Locator): Locator {
  return dialog
    .getByRole('heading', { name: /This Space's library/ })
    .locator('xpath=..');
}

export function conflictDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'That name is already in use' });
}

/** Step A happy path: pick a template from the picker; the add commits immediately. */
export async function addTemplateToSpace(page: Page, templateName: string) {
  const dialog = await openPickerDialog(page);
  await pickerRow(page, dialog, templateName).click();
  // Mutation + refetch roundtrip on the live shared stack — never the 5s default.
  await expect(dialog).not.toBeVisible({ timeout: 20_000 });
  await expect(entryKebab(page, templateName)).toBeVisible({ timeout: 20_000 });
}

/* ------------------------------------------------------------------ */
/* Entry removal                                                       */
/* ------------------------------------------------------------------ */

export function removeConfirmDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Remove this classification?' });
}

/**
 * Cleanup-grade removal: navigates itself, no-ops when the entry is absent.
 * Exact-label matched so 'e2e024 SL Removal' can never remove '… Removal Keep'.
 *
 * Multi-match safe: role-name matching whitespace-normalizes, so a leaked
 * trailing-space variant (SL-02's whitespace probe under a regressed guard)
 * resolves to the SAME accessible name as the original — a bare `.click()`
 * would then throw a strict-mode violation and cleanup would remove neither.
 * Instead delete `.first()` in a bounded loop until the label is gone.
 */
export async function removeEntryIfPresent(
  page: Page,
  label: string
): Promise<boolean> {
  await gotoSettingsAbout(page);
  const kebab = entryKebab(page, label);
  let removed = false;
  const maxPasses = 5;
  for (let pass = 0; pass < maxPasses; pass++) {
    // First pass gates on a hydration-safe (two-sample-stable) count; later
    // passes follow a toHaveCount barrier, so an instant read is safe there.
    const count =
      pass === 0 ? await stableLocatorCount(kebab) : await kebab.count();
    if (count === 0) break;
    await kebab.first().click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Remove classification' }).click();
    const dialog = removeConfirmDialog(page);
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
    // Mutation + refetch roundtrip on the live shared stack.
    await expect(kebab).toHaveCount(count - 1, { timeout: 20_000 });
    removed = true;
  }
  return removed;
}

/* ------------------------------------------------------------------ */
/* Settings → Templates: classification templates                      */
/* ------------------------------------------------------------------ */

export function classificationTemplatesTrigger(page: Page): Locator {
  return page.getByRole('button', { name: /^Classification templates/ });
}

export async function ensureClassificationTemplatesSectionOpen(page: Page) {
  const trigger = classificationTemplatesTrigger(page);
  await expect(trigger).toBeVisible();
  if ((await trigger.getAttribute('aria-expanded')) === 'false') {
    await trigger.click();
  }
}

export interface ClassificationTemplateSpec {
  name: string;
  description?: string;
  cardinality: 'MULTI_SELECT' | 'SINGLE_SELECT';
  values: string[];
}

/**
 * Create a classification template in THIS Space's library
 * (/settings/templates → Classification templates → Add new → Create new).
 */
export async function createClassificationTemplate(
  page: Page,
  spec: ClassificationTemplateSpec
) {
  await gotoTemplatesSettings(page);
  await ensureClassificationTemplatesSectionOpen(page);

  // The "Add new" dropdown lives beside the section's collapsible trigger, in
  // the same header row — scope through the trigger's parent so the other five
  // template sections' identical "Add new" buttons can never be hit.
  const sectionHeader =
    classificationTemplatesTrigger(page).locator('xpath=..');
  await sectionHeader.getByRole('button', { name: 'Add new' }).click();
  await page.getByRole('menuitem', { name: 'Create new' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Create classification template',
  });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('textbox', { name: 'Template name' }).fill(spec.name);
  await dialog
    .getByPlaceholder('What is this template for?')
    .fill(spec.description ?? `${SL_PREFIX} suite artifact — safe to delete.`);

  if (spec.cardinality === 'SINGLE_SELECT') {
    await dialog.getByRole('combobox', { name: 'Selection type' }).click();
    await page.getByRole('option', { name: /^Single-select/ }).click();
  }

  // Quick-add: type a value and press Enter — appends in authored order.
  const quickAdd = dialog.getByLabel('Values', { exact: true });
  for (const value of spec.values) {
    await quickAdd.fill(value);
    await quickAdd.press('Enter');
  }
  // The counter pluralizes: "1 value defined" / "3 values defined".
  await expect(
    dialog.getByText(new RegExp(`^${spec.values.length} values? defined$`))
  ).toBeVisible();

  await dialog.getByRole('button', { name: 'Save' }).click();
  // Mutation + refetch roundtrip on the live shared stack. `.first()` keeps
  // this multi-match safe: if a previous crashed run leaked a card with the
  // same name, the fresh create yields TWO exact-name matches and a bare
  // toBeVisible would strict-mode-crash — the afterAll delete loop then
  // removes every copy.
  await expect(templatePreviewButton(page, spec.name).first()).toBeVisible({
    timeout: 20_000,
  });
}

export function templatePreviewButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Preview: ${name}`, exact: true });
}

/** The template card root — the ancestor styled with the standalone `group` class. */
export function templateCard(page: Page, name: string): Locator {
  return templatePreviewButton(page, name).locator(
    "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' group ')][1]"
  );
}

/**
 * Cleanup-grade template deletion: navigates itself, no-ops when absent.
 * Exact-name matched via the card's "Preview: <name>" aria-label.
 *
 * Multi-match safe (mirrors the TL helper's exact-name delete loop): after a
 * crashed run leaks a card, a re-run's create leaves TWO cards with the same
 * name — a single-shot `templateCard(name).click()` would then throw a
 * strict-mode violation that afterAll's `.catch(() => {})` swallows, keeping
 * the leak. Delete the FIRST matching card in a bounded loop until the exact
 * name is gone. The loop stays fenced to this exact name and can never touch
 * other cards (the seeded SDGs template included).
 */
export async function deleteClassificationTemplateIfPresent(
  page: Page,
  name: string
): Promise<boolean> {
  await gotoTemplatesSettings(page);
  await ensureClassificationTemplatesSectionOpen(page);
  const preview = templatePreviewButton(page, name);
  // Hydration-safe gate: an instant 0 right after the navigation anchor could
  // mean "not loaded yet" and silently no-op the cleanup.
  let before = await stableLocatorCount(preview);
  let deleted = false;
  const maxPasses = 5;
  for (let pass = 0; pass < maxPasses && before > 0; pass++, before--) {
    await preview
      .first()
      .locator(
        "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' group ')][1]"
      )
      .getByRole('button', { name: 'Template actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const confirm = page.getByRole('alertdialog', { name: 'Delete template?' });
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.getByRole('button', { name: 'Delete template' }).click();
    // Mutation + refetch roundtrip on the live shared stack.
    await expect(preview).toHaveCount(before - 1, { timeout: 20_000 });
    deleted = true;
  }
  return deleted;
}

/* ------------------------------------------------------------------ */
/* Public About page (/eco1/about)                                     */
/* ------------------------------------------------------------------ */

export function aboutClassificationList(page: Page): Locator {
  return page.getByTestId('classification-group-list');
}

/**
 * One labelled group on the About page. The group heading (h3) sits in a
 * header row that is a direct child of the group container.
 */
export function aboutGroup(page: Page, label: string): Locator {
  return aboutClassificationList(page)
    .getByRole('heading', { level: 3, name: label, exact: true })
    .locator('xpath=../..');
}

/* ------------------------------------------------------------------ */
/* Leak detector (adjudicated cross-cutting decision #2)               */
/* ------------------------------------------------------------------ */

/**
 * Suite-final invariant sweep: scan both editor surfaces for anything still
 * carrying the 'e2e024 SL' prefix, best-effort delete it, and report what was
 * found so the caller can fail loudly. Pre-existing state is untouched by
 * construction (prefix-scoped lookups only).
 *
 * Case-INSENSITIVE by design: SL-02 deliberately submits case variants of
 * prefixed labels ('e2e024 sl dup'), so a regressed duplicate guard leaks
 * lowercase artifacts a case-sensitive sweep would silently miss. The removal
 * calls still pass the verbatim leaked label, so exact-match deletion works.
 */
export async function sweepSuiteArtifacts(page: Page): Promise<string[]> {
  const leaked: string[] = [];
  const slPrefixLower = SL_PREFIX.toLowerCase();

  await gotoSettingsAbout(page);
  const prefixedKebabs = page.getByRole('button', {
    name: new RegExp(`^Classification actions: ${SL_PREFIX}`, 'i'),
  });
  // Hydration-safe: settle the count across two samples before reading the
  // labels, so a list that renders after the navigation anchor can never
  // produce a false-clean sweep.
  await stableLocatorCount(prefixedKebabs);
  const kebabLabels = await prefixedKebabs.evaluateAll(elements =>
    elements.map(el => el.getAttribute('aria-label') ?? '')
  );
  for (const raw of kebabLabels) {
    const label = raw.replace(/^Classification actions: /, '');
    if (!label.toLowerCase().startsWith(slPrefixLower)) continue;
    leaked.push(`space classification entry "${label}"`);
    await removeEntryIfPresent(page, label).catch(() => {});
  }

  await gotoTemplatesSettings(page);
  await ensureClassificationTemplatesSectionOpen(page);
  const prefixedPreviews = page.getByRole('button', {
    name: new RegExp(`^Preview: ${SL_PREFIX}`, 'i'),
  });
  // Same hydration-safe settle as the entries surface above.
  await stableLocatorCount(prefixedPreviews);
  const previewLabels = await prefixedPreviews.evaluateAll(elements =>
    elements.map(el => el.getAttribute('aria-label') ?? '')
  );
  for (const raw of previewLabels) {
    const name = raw.replace(/^Preview: /, '');
    if (!name.toLowerCase().startsWith(slPrefixLower)) continue;
    leaked.push(`space-library template "${name}"`);
    await deleteClassificationTemplateIfPresent(page, name).catch(() => {});
  }

  return leaked;
}
