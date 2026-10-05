/**
 * Page helpers shared by both 024-classifications suites. Every navigation is
 * relative to the file's own seeded Space (`classifications.fixture.ts`).
 *
 * Locators are role/label based against the CRD UI:
 * - Entry kebab:            "Classification actions: <label>"
 * - Entry meta line:        "Multi-select · N selected" / "Single-select · N selected"
 * - Chip deselect:          "Deselect <value label>"
 * - Picker dialog:          "Add a classification"; conflict dialog "That name is already in use"
 * - Removal confirm:        alertdialog "Remove this classification?"
 * - Template card preview:  "Preview: <name>"; card kebab "Template actions"
 * - Template delete:        alertdialog "Delete template?" → button "Delete template"
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

/** The selection-write mutation the entry checkboxes/radios/chips commit through. */
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

export async function waitForAboutSettings(page: Page) {
  await expect(classificationsSection(page)).toBeVisible({ timeout: 20_000 });
  await expect(
    classificationsSection(page).getByRole('button', {
      name: 'Add Classification',
    })
  ).toBeVisible({ timeout: 20_000 });
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

/** The chips list inside an entry card (the only role=list in the card). */
export function entryChips(page: Page, label: string): Locator {
  return entryCard(page, label).getByRole('list');
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

/** Toggle the "Show on the Space page" switch via the kebab menu (FR-010b). */
export async function toggleEntryDisplay(page: Page, label: string) {
  const saved = operationResponse(page, 'UpdateClassificationEntryDisplay');
  const menu = await openEntryMenu(page, label);
  // The switch row prevents the default menu close so the menu stays open —
  // dismiss it explicitly once the toggle has been clicked.
  await menu.getByRole('menuitem', { name: 'Show on the Space page' }).click();
  await saved;
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
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

/** Step A happy path: pick a template from the picker; the add commits immediately. */
export async function addTemplateToSpace(page: Page, templateName: string) {
  const dialog = await openPickerDialog(page);
  await pickerRow(page, dialog, templateName).click();
  await expect(dialog).not.toBeVisible({ timeout: 20_000 });
  await expect(entryKebab(page, templateName)).toBeVisible({ timeout: 20_000 });
}

/* ------------------------------------------------------------------ */
/* Entry removal (UI under test)                                       */
/* ------------------------------------------------------------------ */

export function removeConfirmDialog(page: Page): Locator {
  return page.getByRole('alertdialog', { name: 'Remove this classification?' });
}

/** Remove an entry that is on screen, through the kebab and the confirmation. */
export async function removeEntry(page: Page, label: string) {
  const menu = await openEntryMenu(page, label);
  await menu.getByRole('menuitem', { name: 'Remove classification' }).click();
  const dialog = removeConfirmDialog(page);
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(entryKebab(page, label)).toHaveCount(0, { timeout: 20_000 });
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
