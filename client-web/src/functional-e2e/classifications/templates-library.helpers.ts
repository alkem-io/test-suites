// Suite-local helpers for the "templates-library" 024-classifications suite
// (classifications-templates.spec.ts). Kept separate from the sibling
// space-lifecycle suite's helpers on purpose — the two suites run in the same
// worktree at the same time and must never share mutable files.
//
// Every selector below was verified against the live 024 dev stack
// (http://localhost:3000, feat/024-classifications) and against the CRD
// component sources in ../../../../client-web/src/crd/components/{templates,classification}.

import { expect, Locator, Page } from '@playwright/test';

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
export const SPACE_URL = `${baseUrl}/eco1`;

/** Every artifact this suite creates is prefixed with this — disjoint from suite 1's "e2e024 SL". */
export const TL_PREFIX = 'e2e024 TL';

/** The seeded platform SDGs vocabulary, full authored sequence (deterministic seed, FR-005a). */
export const SDG_VALUES = [
  '1 · No Poverty',
  '2 · Zero Hunger',
  '3 · Good Health and Well-being',
  '4 · Quality Education',
  '5 · Gender Equality',
  '6 · Clean Water and Sanitation',
  '7 · Affordable and Clean Energy',
  '8 · Decent Work and Economic Growth',
  '9 · Industry, Innovation and Infrastructure',
  '10 · Reduced Inequalities',
  '11 · Sustainable Cities and Communities',
  '12 · Responsible Consumption and Production',
  '13 · Climate Action',
  '14 · Life Below Water',
  '15 · Life on Land',
  '16 · Peace, Justice and Strong Institutions',
  '17 · Partnerships for the Goals',
];

/** Picker group headings render as "<label> (<count>)" (CSS uppercases them; the DOM text keeps case). */
export const PLATFORM_GROUP = /^Platform-wide \(\d+\)$/;
export const SPACE_GROUP = /^This Space's library \(\d+\)$/;

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Read a list until it is STABLE across two consecutive samples (500ms
 * apart, bounded). The navigation anchors (templates search box /
 * #classifications) can render before the card/entry lists hydrate, so a
 * single instant read can return [] meaning "not loaded yet" rather than
 * "empty" — which would false-clean the leak sweep, silently no-op cleanup,
 * mis-open TL-06's skip gate, and corrupt TL-03's pre/post baselines. Two
 * equal consecutive samples distinguish "settled" from "still hydrating".
 */
async function readStableList(
  read: () => Promise<string[]>
): Promise<string[]> {
  let previous = await read();
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const next = await read();
    if (
      next.length === previous.length &&
      next.every((value, i) => value === previous[i])
    ) {
      return next;
    }
    previous = next;
  }
  return previous;
}

// ---------------------------------------------------------------------------
// Space Template Library (/eco1/settings/templates)
// ---------------------------------------------------------------------------

export async function gotoTemplatesSettings(page: Page): Promise<void> {
  await page.goto(`${SPACE_URL}/settings/templates`);
  await expect(
    page.getByRole('textbox', { name: /^Search templates/ })
  ).toBeVisible({ timeout: 30_000 });
  await expect(sectionHeaderButton(page)).toBeVisible({ timeout: 30_000 });
}

/** The collapsible section header button — its text concatenates title + count badge + subtitle. */
export function sectionHeaderButton(page: Page): Locator {
  return page.getByRole('button', { name: /^Classification templates/ });
}

/** The whole "Classification templates" section (one li of the "Template sections" list). */
export function classificationSection(page: Page): Locator {
  return page
    .getByRole('list', { name: 'Template sections' })
    .getByRole('listitem')
    .filter({
      has: page.getByRole('button', { name: /^Classification templates/ }),
    })
    .first();
}

/** Parse the numeric count badge out of the section header. */
export async function classificationSectionCount(page: Page): Promise<number> {
  const text = (await sectionHeaderButton(page).textContent()) ?? '';
  const match = text.match(/Classification templates\s*(\d+)/);
  if (!match) {
    throw new Error(
      `Could not parse the Classification templates count badge from: "${text}"`
    );
  }
  return parseInt(match[1], 10);
}

/** Section header texts of every template section, in DOM order (for order assertions). */
export async function sectionTitleTexts(page: Page): Promise<string[]> {
  return page
    .locator('ul[aria-label="Template sections"] > li')
    .evaluateAll(lis =>
      lis.map(li => (li.querySelector('button')?.textContent ?? '').trim())
    );
}

/** A template card (by exact name) inside the Classification templates section. */
export function templateCard(page: Page, name: string): Locator {
  return classificationSection(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first();
}

/**
 * Names (h4 titles) of every card currently in the Classification templates
 * section — hydration-stable (see readStableList): an instant read right
 * after the navigation anchor can see an empty not-yet-loaded list.
 */
export async function listClassificationTemplateNames(
  page: Page
): Promise<string[]> {
  return readStableList(async () => {
    const list = classificationSection(page).getByRole('list', {
      name: 'Templates',
    });
    if ((await list.count()) === 0) return [];
    return (await list.locator('h4').allTextContents()).map(s => s.trim());
  });
}

export async function openCreateClassificationTemplateDialog(
  page: Page
): Promise<Locator> {
  await classificationSection(page)
    .getByRole('button', { name: 'Add new' })
    .click();
  await page.getByRole('menuitem', { name: 'Create new' }).click();
  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Create classification template' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

export type CreateTemplateOptions = {
  name: string;
  description?: string;
  values: string[];
};

/**
 * Create a Multi-select classification template in the Space library and wait
 * for its card. A description is ALWAYS filled: the product's template form
 * validates it as required ("A description is required.",
 * templates.en.json form.common.descriptionRequired), so an empty description
 * leaves the dialog open with a validation error instead of saving.
 */
export async function createClassificationTemplate(
  page: Page,
  options: CreateTemplateOptions
): Promise<void> {
  await gotoTemplatesSettings(page);
  const dialog = await openCreateClassificationTemplateDialog(page);
  await dialog
    .getByRole('textbox', { name: 'Template name' })
    .fill(options.name);
  await dialog
    .getByRole('textbox', { name: 'Description' })
    .fill(
      options.description ??
        `Created by the e2e024 templates-library suite: ${options.name}.`
    );
  const quickAdd = dialog.locator('#classification-tpl-quick-add');
  for (const value of options.values) {
    await quickAdd.fill(value);
    await quickAdd.press('Enter');
  }
  await expect(
    dialog.getByText(
      `${options.values.length} value${options.values.length === 1 ? '' : 's'} defined`
    )
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(templateCard(page, options.name)).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Delete classification template cards with this exact name (duplicates
 * can only be this suite's own leaked re-creations across runs — the loop
 * stays fenced to the exact name and never touches other cards).
 * Returns true when at least one card was found and deleted.
 *
 * `maxDeletions` caps how many cards may be removed. The default (Infinity)
 * keeps the leak-sweeping semantics for the suite's own TL-prefixed names;
 * TL-06 passes 1 for the unprefixed imported 'SDGs' copy, so a copy imported
 * concurrently by another actor during the test window can never be destroyed
 * alongside ours (the pre/post-restore assertion then reports it instead).
 *
 * The confirm renders as a Radix AlertDialog → role="alertdialog", NOT
 * "dialog" (crd/components/dialogs/ConfirmationDialog.tsx). Matching
 * getByRole('dialog') here silently never resolves and leaks the artifact.
 */
export async function deleteClassificationTemplateIfPresent(
  page: Page,
  name: string,
  maxDeletions = Infinity
): Promise<boolean> {
  await gotoTemplatesSettings(page);
  // Hydration-stable settle before the count gate: an instant cards.count()
  // right after the navigation anchor can read 0 while the card list is
  // still loading and silently no-op the cleanup (see readStableList).
  await listClassificationTemplateNames(page);
  const cards = classificationSection(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  let deleted = false;
  let before = await cards.count();
  let remaining = Math.min(before, maxDeletions);
  for (; remaining > 0; remaining--, before--) {
    await cards
      .first()
      .getByRole('button', { name: 'Template actions' })
      .click();
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    const confirm = page
      .getByRole('alertdialog')
      .filter({ hasText: 'Delete template?' });
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.getByRole('button', { name: 'Delete template' }).click();
    await expect(cards).toHaveCount(before - 1, { timeout: 20_000 });
    deleted = true;
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Space About editor (/eco1/settings/about) — Classifications section
// ---------------------------------------------------------------------------

export async function gotoSpaceAboutSettings(page: Page): Promise<void> {
  await page.goto(`${SPACE_URL}/settings/about`);
  await waitForAboutSettings(page);
}

export async function waitForAboutSettings(page: Page): Promise<void> {
  await expect(page.locator('#classifications')).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole('button', { name: 'Add Classification' })
  ).toBeVisible({ timeout: 30_000 });
}

/** One classification entry card (icon tile + label + meta + kebab) by exact display label. */
export function entryCard(page: Page, label: string): Locator {
  return page
    .locator('#classifications div.rounded-lg.border.p-4')
    .filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    .first();
}

/**
 * The entry card's kebab (aria-label "Classification actions: <label>").
 * exact: true is load-bearing — getByRole name matching is case-insensitive
 * SUBSTRING by default, so without it "Classification actions: e2e024 TL X"
 * would also match "...e2e024 TL X Extra" and strict-mode-crash the bare
 * kebab.click() in removeEntryIfPresent / the sweep.
 */
export function entryKebab(page: Page, label: string): Locator {
  return page.getByRole('button', {
    name: `Classification actions: ${label}`,
    exact: true,
  });
}

/**
 * Display labels of ALL Space classification entries — hydration-stable (see
 * readStableList). The stability poll runs on the UNFILTERED list so a
 * still-hydrating set of non-TL entries also counts as "not settled yet".
 */
export async function listAllEntryLabels(page: Page): Promise<string[]> {
  return readStableList(async () => {
    const labels = await page
      .locator('#classifications')
      .getByRole('heading')
      .allTextContents();
    return labels.map(s => s.trim());
  });
}

/** Display labels of the Space's classification entries owned by THIS suite (TL prefix only). */
export async function listTlEntryLabels(page: Page): Promise<string[]> {
  return (await listAllEntryLabels(page)).filter(l => l.startsWith(TL_PREFIX));
}

/** Open the Step A picker dialog ("Add a classification"). */
export async function openPicker(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Add Classification' }).click();
  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Add a classification' });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  return dialog;
}

/** The group container (heading + row list) for a picker group heading. */
export function pickerGroup(dialog: Locator, heading: RegExp): Locator {
  return dialog.getByRole('heading', { name: heading }).locator('xpath=..');
}

/** Parse the live "(n)" count from a picker group heading. */
export async function pickerGroupCount(
  dialog: Locator,
  heading: RegExp
): Promise<number> {
  const text =
    (await dialog.getByRole('heading', { name: heading }).textContent()) ?? '';
  const match = text.match(/\((\d+)\)/);
  if (!match) {
    throw new Error(`Could not parse a picker group count from: "${text}"`);
  }
  return parseInt(match[1], 10);
}

/** Pick a template row in the picker — the add commits immediately (FR-006a). */
export async function addEntryFromPicker(
  page: Page,
  templateName: string
): Promise<void> {
  const dialog = await openPicker(page);
  await dialog
    .getByRole('button', {
      name: new RegExp(`^${escapeRegExp(templateName)}`),
    })
    .first()
    .click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });
  await expect(entryCard(page, templateName)).toBeVisible({ timeout: 20_000 });
}

/**
 * Remove a Space classification entry by display label if present (kebab →
 * Remove classification → confirm). Returns true when an entry was removed.
 */
export async function removeEntryIfPresent(
  page: Page,
  label: string
): Promise<boolean> {
  await gotoSpaceAboutSettings(page);
  // Hydration-stable presence gate: an instant kebab.count() right after the
  // navigation anchor can read 0 while the entry list is still loading and
  // silently no-op the cleanup (see readStableList).
  const labels = await listAllEntryLabels(page);
  if (!labels.includes(label)) return false;
  const kebab = entryKebab(page, label);
  if ((await kebab.count()) === 0) return false;
  await kebab.click();
  await page.getByRole('menuitem', { name: /Remove classification/ }).click();
  // Radix AlertDialog → role="alertdialog", not "dialog" (see delete helper).
  const confirm = page
    .getByRole('alertdialog')
    .filter({ hasText: 'Remove this classification?' });
  await expect(confirm).toBeVisible({ timeout: 15_000 });
  await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(kebab).toHaveCount(0, { timeout: 20_000 });
  return true;
}

// ---------------------------------------------------------------------------
// Shared preview-dialog assertion (library + pack render the same dialog)
// ---------------------------------------------------------------------------

/** Assert the SDGs preview dialog: meta line + full 17-value numbered grid in authored order. */
export async function assertSdgPreviewDialog(page: Page): Promise<void> {
  const preview = page.getByRole('dialog');
  await expect(preview).toBeVisible({ timeout: 15_000 });
  await expect(preview).toContainText('Multi-select · 17 values');
  await expect(preview).toContainText('Defined values');
  const items = preview.locator('ol > li');
  await expect(items).toHaveCount(17);
  for (let i = 0; i < SDG_VALUES.length; i++) {
    await expect(items.nth(i)).toContainText(SDG_VALUES[i]);
    // The grid is numbered — the order marker makes authored order visible.
    await expect(items.nth(i).locator('span').first()).toHaveText(
      String(i + 1)
    );
  }
  await preview.getByRole('button', { name: 'Close' }).click();
  await expect(preview).toBeHidden();
}

// ---------------------------------------------------------------------------
// Suite-final leak detector (cross-cutting decision 2)
// ---------------------------------------------------------------------------

/**
 * Scan both /eco1 surfaces for stragglers with the suite's own prefix,
 * best-effort delete them, and report what was found. The caller fails the
 * suite loudly when the returned list is non-empty.
 */
export async function sweepTlArtifacts(page: Page): Promise<string[]> {
  const leaked: string[] = [];
  await gotoSpaceAboutSettings(page);
  for (const label of await listTlEntryLabels(page)) {
    leaked.push(`space entry: ${label}`);
    await removeEntryIfPresent(page, label).catch(() => {});
  }
  await gotoTemplatesSettings(page);
  const names = (await listClassificationTemplateNames(page)).filter(n =>
    n.startsWith(TL_PREFIX)
  );
  for (const name of names) {
    leaked.push(`space-library template: ${name}`);
    await deleteClassificationTemplateIfPresent(page, name).catch(() => {});
  }
  return leaked;
}
