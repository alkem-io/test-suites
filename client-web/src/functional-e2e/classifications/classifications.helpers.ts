/**
 * Page helpers shared by both 024-classifications suites. Every navigation is
 * relative to the file's own seeded Space (`classifications.fixture.ts`).
 *
 * Locators are role/label based against the CRD UI:
 * - Section card:           `#classifications`, a collapsed-by-default SettingsSection whose
 *                           `<h3><button>Classifications</button></h3>` trigger opens it
 * - Entry kebab:            "Classification actions: <label>"
 * - Entry meta line:        "Multi-select · N selected" / "Single-select · N selected"
 * - Chips:                  every vocabulary value, authored order; selected = filled chip with a
 *                           "Deselect <value label>" ×, unselected = dashed "Select <value label>"
 * - Picker dialog:          "Add a classification"; conflict dialog "That name is already in use"
 * - Save bar:               region "Unsaved changes" → "Save changes" / "Discard" (→ alertdialog
 *                           "Discard N unsaved changes?"); toast "Changes saved"
 * - Template card preview:  "Preview: <name>"; card kebab "Template actions"
 * - Template delete:        alertdialog "Delete template?" → button "Delete template"
 *
 * Save model (client-web#10437; workspace spec 024 Session 2026-10-22 amends FR-006a for the CRD client): every
 * classification add, removal, selection and display toggle on Settings → About is STAGED and
 * written only by the tab-wide "Save changes" bar. The UI helpers below therefore stage AND save
 * by default (`{ save: false }` keeps the change staged), and each Save is anchored on the
 * server ack of the mutation it is expected to issue.
 */
import { expect, type Locator, type Page } from '@playwright/test';
import { spaceUrl } from './classifications.fixture';

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
/** The same group as a subspace sees it (client-web#10490 — FR-007a: the L0 library). */
export const SUBSPACE_LIBRARY_GROUP = /^The top-level space's library \(\d+\)$/;

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ------------------------------------------------------------------ */
/* GraphQL response sink (SPA settle for negatives)                    */
/* ------------------------------------------------------------------ */

export interface GraphQLSink {
  texts: string[];
}

/** Collects every GraphQL response body the page receives. */
export function collectGraphQLBodies(page: Page): GraphQLSink {
  const sink: GraphQLSink = { texts: [] };
  page.on('response', response => {
    if (!response.url().includes('graphql')) return;
    response
      .text()
      .then(text => sink.texts.push(text))
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

/**
 * Arm a waiter for the NEXT successful response of a GraphQL operation. Register BEFORE
 * the triggering click and await before any navigation: the selection UI renders
 * optimistically, so a DOM assertion alone can pass while the write is still in flight.
 */
export function operationResponse(page: Page, operationName: string) {
  return page.waitForResponse(response => {
    if (!response.url().includes('graphql') || !response.ok()) return false;
    try {
      return response.request().postDataJSON()?.operationName === operationName;
    } catch {
      return false;
    }
  });
}

/** The selection-write mutation a Save issues for a staged value selection. */
export const selectionSaved = (page: Page) =>
  operationResponse(page, 'UpdateClassificationEntrySelection');

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

/** Settings → About of the seeded Space, or of `url` (a subspace) when given. */
export async function gotoSettingsAbout(page: Page, url: string = spaceUrl()) {
  await page.goto(`${url}/settings/about`);
  await waitForAboutSettings(page);
}

/** The About tab has rendered and the Classifications section is open with its add button on screen. */
export async function waitForAboutSettings(page: Page) {
  await expect(classificationsSection(page)).toBeVisible({ timeout: 20_000 });
  await ensureClassificationsSectionOpen(page);
}

/**
 * Reload the About tab and re-open the Classifications section — the open state is not
 * persisted. Callers save or discard first: a dirty tab arms a beforeunload prompt.
 */
export async function reloadSettingsAbout(page: Page) {
  await page.reload();
  await waitForAboutSettings(page);
}

/* ------------------------------------------------------------------ */
/* The tab-wide unsaved-changes bar                                    */
/* ------------------------------------------------------------------ */

/** The bottom bar; aria-hidden (so absent from the role tree) while the tab is clean. */
export function unsavedChangesBar(page: Page): Locator {
  return page.getByRole('region', { name: 'Unsaved changes' });
}

/** The live "N unsaved change(s)" count of the bar (the paragraph, not the count badge beside it). */
export async function unsavedChangesCount(page: Page): Promise<number> {
  const text =
    (await unsavedChangesBar(page)
      .getByText(/^\d+ unsaved changes?$/)
      .textContent()) ?? '';
  const match = text.match(/^(\d+) unsaved change/);
  if (!match) throw new Error(`Could not parse the unsaved-changes count from: "${text}"`);
  return parseInt(match[1], 10);
}

/**
 * Commit the tab's staged changes through "Save changes". `operations` are the GraphQL
 * mutations this Save is expected to issue; each is armed BEFORE the click so the server
 * ack — not the optimistic render — is the barrier. Then the bar retracts (the hook only
 * drops a change from its buffer once the post-save refetch has landed) and the toast shows.
 */
export async function saveAboutChanges(page: Page, operations: string[] = []) {
  const bar = unsavedChangesBar(page);
  await expect(bar).toBeVisible();
  const acks = operations.map(name => operationResponse(page, name));
  await bar.getByRole('button', { name: 'Save changes' }).click();
  await Promise.all(acks);
  await expect(bar).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText('Changes saved').first()).toBeVisible({
    timeout: 20_000,
  });
}

/** Drop every staged change through Discard and its confirmation. */
export async function discardAboutChanges(page: Page) {
  const bar = unsavedChangesBar(page);
  await bar.getByRole('button', { name: 'Discard', exact: true }).click();
  const confirm = page.getByRole('alertdialog', {
    name: /^Discard \d+ unsaved changes?\?$/,
  });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(bar).toHaveCount(0);
}

export async function gotoTemplatesSettings(page: Page) {
  await page.goto(`${spaceUrl()}/settings/templates`);
  await expect(
    page.getByRole('textbox', { name: /^Search templates/ })
  ).toBeVisible({
    timeout: 20_000,
  });
  await expect(classificationTemplatesTrigger(page)).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * The CRD forbidden page's title — what the Space settings access guard renders
 * for an authenticated non-admin on any /settings/* tab (client-web
 * `useSpaceSettingsAccessGuard` → `CrdForbiddenPage`, `error.en.json › forbidden.title`).
 */
export function forbiddenHeading(page: Page): Locator {
  return page.getByRole('heading', { name: 'Access Restricted', exact: true });
}

/** Public About surface. Callers settle on their own anchors (or a GraphQL sink). */
export async function gotoAboutPage(page: Page) {
  await page.goto(`${spaceUrl()}/about`);
  await page.waitForLoadState('domcontentloaded');
}

/* ------------------------------------------------------------------ */
/* Settings → About: Classifications section + entry cards             */
/* ------------------------------------------------------------------ */

/** The Classifications SettingsSection card on /settings/about (collapsed by default). */
export function classificationsSection(page: Page): Locator {
  return page.locator('#classifications');
}

/** The section's `<h3><button>` collapsible trigger. */
export function classificationsSectionTrigger(page: Page): Locator {
  return classificationsSection(page)
    .getByRole('heading', { level: 3 })
    .getByRole('button', { name: 'Classifications', exact: true });
}

/**
 * Open the Classifications section if it is collapsed. Retried through `toPass`: the tab can
 * re-mount its sections after the first paint (a refetch), which resets the open state.
 */
export async function ensureClassificationsSectionOpen(page: Page) {
  const trigger = classificationsSectionTrigger(page);
  await expect(trigger).toBeVisible({ timeout: 20_000 });
  await expect(async () => {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await trigger.click();
    }
    await expect(
      classificationsSection(page).getByRole('button', {
        name: 'Add Classification',
      })
    ).toBeVisible({ timeout: 3_000 });
  }).toPass({ intervals: [500, 1_000, 2_000], timeout: 20_000 });
}

export function entryKebab(page: Page, label: string): Locator {
  return page.getByRole('button', {
    name: `Classification actions: ${label}`,
    exact: true,
  });
}

/**
 * DOM-level kebab lookup for counting entries WHILE a modal dialog is open: the modal
 * aria-hides the page behind it, so the role-based locator above resolves to 0 elements
 * even though the entry card is still in the DOM.
 */
export function entryKebabDom(page: Page, label: string): Locator {
  return page.locator(`button[aria-label="Classification actions: ${label}"]`);
}

/**
 * The entry card root. The kebab button is a direct child of the card's header row,
 * which is a direct child of the card root (ClassificationEntryCard).
 */
export function entryCard(page: Page, label: string): Locator {
  return entryKebab(page, label).locator('xpath=../..');
}

/**
 * The chip list inside an entry card (the only role=list in the card): EVERY vocabulary
 * value in authored order, selected ones as filled chips with a "Deselect <value>" ×,
 * the rest as dashed "Select <value>" buttons (client-web#10437).
 */
export function entryChips(page: Page, label: string): Locator {
  return entryCard(page, label).getByRole('list');
}

/** Only the SELECTED chips of an entry card, in authored order. */
export function selectedChips(page: Page, label: string): Locator {
  return entryChips(page, label)
    .getByRole('listitem')
    .filter({ has: page.getByRole('button', { name: /^Deselect / }) });
}

/** The "Unsaved" badge an entry carries while its add is staged but not yet saved. */
export function entryUnsavedBadge(page: Page, label: string): Locator {
  return entryCard(page, label).getByText('Unsaved', { exact: true });
}

export function entryHiddenBadge(page: Page, label: string): Locator {
  return entryCard(page, label).getByText('Not shown on the Space page');
}

/** Entry headings (h4) of the Classifications section, in render order. */
export async function entryLabelsInOrder(page: Page): Promise<string[]> {
  return (
    await classificationsSection(page)
      .getByRole('heading', { level: 4 })
      .allTextContents()
  ).map(text => text.trim());
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

/**
 * Toggle the "Show on the Space page" switch via the kebab menu (FR-010b). The toggle is
 * staged; by default the helper then saves it, anchored on the display mutation's ack.
 */
export async function toggleEntryDisplay(
  page: Page,
  label: string,
  { save = true }: { save?: boolean } = {}
) {
  const menu = await openEntryMenu(page, label);
  // The switch row prevents the default menu close so the menu stays open —
  // dismiss it explicitly once the toggle has been clicked.
  await menu.getByRole('menuitem', { name: 'Show on the Space page' }).click();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  if (save) {
    await saveAboutChanges(page, ['UpdateClassificationEntryDisplay']);
  }
}

/** Save a staged value selection, anchored on the selection mutation's ack (FR-012d). */
export async function saveSelection(page: Page) {
  await saveAboutChanges(page, ['UpdateClassificationEntrySelection']);
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
  if (!match)
    throw new Error(`Could not parse a picker group count from: "${text}"`);
  return parseInt(match[1], 10);
}

export function conflictDialog(page: Page): Locator {
  return page.getByRole('dialog', { name: 'That name is already in use' });
}

/**
 * Step A happy path: pick a template from the picker. The add is staged (the card carries an
 * "Unsaved" badge); by default the helper then saves it, anchored on the add mutation's ack.
 */
export async function addTemplateToSpace(
  page: Page,
  templateName: string,
  { save = true }: { save?: boolean } = {}
) {
  const dialog = await openPickerDialog(page);
  await pickerRow(page, dialog, templateName).click();
  await expect(dialog).not.toBeVisible({ timeout: 20_000 });
  await expect(entryKebab(page, templateName)).toBeVisible({ timeout: 20_000 });
  await expect(entryUnsavedBadge(page, templateName)).toBeVisible();
  if (save) {
    await saveAboutChanges(page, ['AddClassificationEntryFromTemplate']);
    await expect(entryUnsavedBadge(page, templateName)).toHaveCount(0);
  }
}

/* ------------------------------------------------------------------ */
/* Entry removal (UI under test)                                       */
/* ------------------------------------------------------------------ */

/**
 * Remove an entry through the kebab. Since client-web#10437 there is no confirmation
 * dialog: the removal is staged (the card leaves the list, Discard brings it back) and
 * written by Save — which the helper does by default, anchored on the delete mutation's ack.
 */
export async function removeEntry(
  page: Page,
  label: string,
  { save = true }: { save?: boolean } = {}
) {
  const menu = await openEntryMenu(page, label);
  await menu.getByRole('menuitem', { name: 'Remove classification' }).click();
  await expect(entryKebab(page, label)).toHaveCount(0, { timeout: 20_000 });
  if (save) {
    await saveAboutChanges(page, ['DeleteClassificationEntry']);
    await expect(entryKebab(page, label)).toHaveCount(0);
  }
}

/* ------------------------------------------------------------------ */
/* Settings → Templates: classification templates                      */
/* ------------------------------------------------------------------ */

/** The collapsible section header button — its text concatenates title + count badge + subtitle. */
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

/** The whole "Classification templates" section (one li of the "Template sections" list). */
export function classificationSection(page: Page): Locator {
  return page
    .getByRole('list', { name: 'Template sections' })
    .getByRole('listitem')
    .filter({ has: classificationTemplatesTrigger(page) })
    .first();
}

/**
 * Opens the classification section's "Add new ▾" menu and waits for both
 * entries. The templates page renders its section list only while
 * `AllTemplatesInTemplatesSet` is not loading, so a reload after the first
 * paint unmounts the list together with an open Radix menu (the 2026-10-12
 * nightly: "element was detached from the DOM", then no menu at all).
 * Retrying the click through `toPass` rides out such a remount instead of
 * clicking once and waiting on a menu that no longer exists.
 */
export async function openClassificationAddNewMenu(page: Page) {
  await expect(async () => {
    await classificationSection(page)
      .getByRole('button', { name: 'Add new' })
      .click();
    await expect(
      page.getByRole('menuitem', { name: 'Create new' })
    ).toBeVisible({ timeout: 3_000 });
    await expect(
      page.getByRole('menuitem', { name: 'Select from library' })
    ).toBeVisible({ timeout: 3_000 });
  }).toPass({ intervals: [500, 1_000, 2_000], timeout: 30_000 });
}

/** Parse the numeric count badge out of the section header. */
export async function classificationSectionCount(page: Page): Promise<number> {
  const text = (await classificationTemplatesTrigger(page).textContent()) ?? '';
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

export function templatePreviewButton(page: Page, name: string): Locator {
  return page.getByRole('button', { name: `Preview: ${name}`, exact: true });
}

/** A template card (by exact name) inside the Classification templates section. */
export function templateCard(page: Page, name: string): Locator {
  return classificationSection(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first();
}

/** The template edit/create dialogs' dismiss button: "Done" while pristine, "Cancel" once edited. */
export function dialogDismiss(dialog: Locator): Locator {
  return dialog.getByRole('button', { name: /^(Done|Cancel)$/ });
}

/**
 * Delete the classification template card with this exact name (UI under test).
 * Asserts the card is there first, so a missing card fails here rather than no-opping.
 */
export async function deleteClassificationTemplate(
  page: Page,
  name: string
): Promise<true> {
  await gotoTemplatesSettings(page);
  await ensureClassificationTemplatesSectionOpen(page);
  const cards = classificationSection(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });
  await expect(cards).toHaveCount(1, { timeout: 20_000 });
  await cards.first().getByRole('button', { name: 'Template actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
  // Radix AlertDialog → role="alertdialog", not "dialog".
  const confirm = page
    .getByRole('alertdialog')
    .filter({ hasText: 'Delete template?' });
  await expect(confirm).toBeVisible({ timeout: 15_000 });
  // Server-ack barrier: the card leaves the list before the delete round trip completes.
  const deleted = operationResponse(page, 'DeleteTemplate');
  await confirm.getByRole('button', { name: 'Delete template' }).click();
  await deleted;
  await expect(cards).toHaveCount(0, { timeout: 20_000 });
  return true;
}

/* ------------------------------------------------------------------ */
/* Public About page                                                   */
/* ------------------------------------------------------------------ */

export function aboutClassificationList(page: Page): Locator {
  return page.getByTestId('classification-group-list');
}

/** One labelled group on the About page; the h3 sits in a header row that is a direct child of the group. */
export function aboutGroup(page: Page, label: string): Locator {
  return aboutClassificationList(page)
    .getByRole('heading', { level: 3, name: label, exact: true })
    .locator('xpath=../..');
}

/* ------------------------------------------------------------------ */
/* Shared preview-dialog assertion (library + pack render the same dialog) */
/* ------------------------------------------------------------------ */

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
