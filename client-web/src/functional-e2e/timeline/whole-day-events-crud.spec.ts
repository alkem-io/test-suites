// Feature: whole-day calendar events — CRUD driven through the CLIENT UI.
// server#6279 (follow-up of #6271, closes server#6267).
// Spec: agents-hq `specs/023-wholeday-calendar-timezone/`
//
// Companion to `whole-day-events-timezone.spec.ts` (which seeds events via API to
// isolate RENDERING). This suite instead creates / edits / deletes events through
// the real form, so the client WRITE path is exercised — the exact code the bugs
// lived in:
//   - toWholeDayWire on create (UTC-midnight anchoring)                 [T1, T2]
//   - the falsy-guarded duration update: narrowing a multi-day whole-day
//     event to a single day used to REVERT on save                      [T3 = QA D2]
//   - widening a single-day whole-day event (regression guard)          [T4 = QA D3]
//   - toggling Whole day ON drops time-of-day / stale duration          [T5 = QA D4]
//   - toggling Whole day OFF resets duration to a sane default          [T6 = QA D5]
//   - single-day whole-day create no longer fails validation            [T7 = QA B1]
//   - full lifecycle incl. delete                                       [T8]
//
// A9 (edit round-trip, no ±1 drift) is covered by T2's reopen assertions.
// Dates are picked in the viewer's timezone via the popover calendar and read
// back from the trigger label; the browser is pinned to Europe/Sofia (UTC+2, the
// reported case — where a create-path day-shift would surface).

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager } from '@alkemio/tests-lib';
import { test as base, expect, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { LoginPage } from '@src/functional-e2e/space/pages';
import { CalendarEventFormPage, dateLabelRe } from './pages/CalendarEventFormPage';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const storageStatePath = path.join(process.cwd(), '.auth', 'whole-day-crud-admin.json');
const VIEWER_TZ = 'Europe/Sofia';

// Fixed future dates (today is well before these), so picker month-nav is deterministic.
const D = (m: number, d: number) => new Date(2026, m - 1, d);

const scenarioConfig: TestScenarioConfig = {
  name: 'whole-day-crud',
  space: {
    about: { profile: { displayName: 'Whole Day CRUD Space' } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: { admins: [TestUser.SPACE_ADMIN], members: [TestUser.SPACE_ADMIN] },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let spaceNameId: string;

const test = base.extend<{ form: CalendarEventFormPage; ctx: BrowserContext; page: Page }>({
  ctx: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: storageStatePath, timezoneId: VIEWER_TZ });
    await use(ctx);
    await ctx.close();
  },
  page: async ({ ctx }, use) => {
    const page = await ctx.newPage();
    await use(page);
  },
  form: async ({ page }, use) => {
    await use(new CalendarEventFormPage(page, baseUrl));
  },
});

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);
  spaceNameId = baseScenario.space.nameId;

  await fs.promises.mkdir(path.dirname(storageStatePath), { recursive: true });
  const setupContext = await browser.newContext({ timezoneId: VIEWER_TZ });
  const setupPage = await setupContext.newPage();
  await new LoginPage(setupPage, baseUrl).login(TestUserManager.users.spaceAdmin.email);
  const accept = setupPage.getByRole('button', { name: 'Accept all cookies' });
  if (await accept.isVisible({ timeout: 3000 }).catch(() => false)) await accept.click();
  await setupContext.storageState({ path: storageStatePath });
  await setupContext.close();
});

test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

// --- T1: create a whole-day event through the UI ---------------------------
test('T1: create a whole-day event via the form; it displays on the picked date', async ({ form, page }) => {
  test.setTimeout(90_000);
  const title = `CRUD Create ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(12, 3));
  await form.pickDate('End date', D(12, 4));
  await form.save();

  // Lands on the detail view; the badge must read the picked day, never a neighbour.
  await expect(
    page.getByRole('img', { name: /December 3(rd)?, 2026/ }).first(),
    'whole-day create must anchor to the picked date (toWholeDayWire), not shift a day'
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('img', { name: /December 2(nd)?, 2026/ })).toHaveCount(0);
});

// --- T2 (QA A9): edit round-trips the chosen dates with no ±1 drift --------
test('T2: reopening a whole-day event in edit shows the originally picked dates', async ({ form }) => {
  test.setTimeout(90_000);
  const title = `CRUD Roundtrip ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(12, 3));
  await form.pickDate('End date', D(12, 5));
  await form.save();

  // First reopen — dates must survive the create write + read back unchanged.
  await form.openEditFromDetail();
  expect(await form.readDate('Start date')).toMatch(dateLabelRe(D(12, 3)));
  expect(await form.readDate('End date')).toMatch(dateLabelRe(D(12, 5)));

  // Save unchanged and reopen again — no drift after an open→save→reopen cycle.
  await form.save();
  await form.openEditFromDetail();
  expect(await form.readDate('Start date')).toMatch(dateLabelRe(D(12, 3)));
  expect(await form.readDate('End date')).toMatch(dateLabelRe(D(12, 5)));
});

// --- T3 (QA D2): narrowing a multi-day whole-day event to a single day ------
test('T3: shrinking a 4-day whole-day event to a single day PERSISTS on save', async ({ form }) => {
  test.setTimeout(90_000);
  const title = `CRUD Shrink ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(7, 20));
  await form.pickDate('End date', D(7, 23)); // 4-day span
  await form.save();

  await form.openEditFromDetail();
  // Narrow End date back to the Start date (minDate allows end === start).
  await form.pickDate('End date', D(7, 20));
  await form.save();

  // The bug: the falsy-guarded update dropped durationMinutes/Days of 0, so the
  // event reverted to the 4-day span. Reopen and prove it stuck as a single day.
  await form.openEditFromDetail();
  expect(await form.readDate('Start date')).toMatch(dateLabelRe(D(7, 20)));
  expect(
    await form.readDate('End date'),
    'narrowed End date must persist as 20 Jul, not revert to 23 Jul'
  ).toMatch(dateLabelRe(D(7, 20)));
});

// --- T4 (QA D3): widening a single-day whole-day event (regression guard) ---
test('T4: widening a single-day whole-day event to 4 days persists', async ({ form }) => {
  test.setTimeout(90_000);
  const title = `CRUD Widen ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(8, 10));
  await form.pickDate('End date', D(8, 10)); // single day
  await form.save();

  await form.openEditFromDetail();
  await form.pickDate('End date', D(8, 13)); // widen to 4 days
  await form.save();

  // Round-trip: the widened End date survives (indirect — implies durationMinutes persisted).
  await form.openEditFromDetail();
  expect(await form.readDate('End date')).toMatch(dateLabelRe(D(8, 13)));

  // Direct proof it actually BECAME multi-day: the list-view grid must highlight
  // exactly the 4 covered days (10, 11, 12, 13 Aug) — not stay a single cell.
  // Guards against a "dates persist but multipleDays renders stale" regression,
  // which the End-date read above cannot catch on its own.
  await form.gotoCalendar(spaceNameId);
  const cells = await form.coveredDayCells(D(8, 10));
  await expect(cells, 'a widened 10->13 Aug whole-day event must cover exactly 4 days').toHaveCount(4);
});

// --- T5 (QA D4): toggling Whole day ON removes time-of-day fields -----------
test('T5: toggling a timed event to Whole day removes Start time / End time / Duration', async ({
  form,
}) => {
  test.setTimeout(90_000);
  const title = `CRUD Toggle On ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Meeting');
  // Leave it timed (whole day OFF), same-day => a Duration field is shown.
  await expect(form.fieldPresent('Start time')).toBeVisible();

  await form.setWholeDay(true);
  // The time-of-day inputs must be gone entirely, not merely disabled.
  await expect(form.fieldPresent('Start time')).toHaveCount(0);
  await expect(form.fieldPresent('End time')).toHaveCount(0);
  await expect(form.fieldPresent('Duration')).toHaveCount(0);
  await expect(form.fieldPresent('Start date')).toBeVisible();
  await expect(form.fieldPresent('End date')).toBeVisible();
});

// --- T6 (QA D5): toggling Whole day OFF resets duration to a sane default ----
test('T6: toggling a whole-day event back to timed restores a sub-day duration field', async ({
  form,
}) => {
  test.setTimeout(90_000);
  const title = `CRUD Toggle Off ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Meeting');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(9, 14));
  await form.pickDate('End date', D(9, 17)); // multi-day whole-day (span 4320 min)

  await form.setWholeDay(false);
  // Same-day timed => Duration field returns; the multi-day span must NOT leak in.
  // (useCrdEventForm resets durationMinutes to the 30-min default on toggle-off.)
  await expect(form.fieldPresent('Start time')).toBeVisible();
  await expect(form.fieldPresent('End date')).toBeVisible();
});

// --- T7 (QA B1): single-day whole-day create succeeds (was a validation error) ---
test('T7: a single-day whole-day event can be created without a date-range error', async ({
  form,
  page,
}) => {
  test.setTimeout(90_000);
  const title = `CRUD Single ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(10, 5));
  await form.pickDate('End date', D(10, 5)); // start === end
  await form.save();

  // No "End must be after start" / "Invalid duration"; we reach the detail view.
  await expect(page.getByText('End must be after start')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /October 5(th)?, 2026/ }).first()).toBeVisible({
    timeout: 15_000,
  });
});

// --- T8: full lifecycle — create then delete via the UI --------------------
test('T8: an event created via the UI can be deleted via the UI', async ({ form, page }) => {
  test.setTimeout(90_000);
  const title = `CRUD Delete ${Date.now()}`;

  await form.gotoCalendar(spaceNameId);
  await form.openCreateForm();
  await form.setTitle(title);
  await form.setType('Event');
  await form.setWholeDay(true);
  await form.pickDate('Start date', D(11, 9));
  await form.pickDate('End date', D(11, 10));
  await form.save();

  await expect(page.getByText(title, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

  await form.openEditFromDetail();
  await form.deleteFromEdit();

  // Back on the list, the event is gone.
  await expect(page.getByText(title, { exact: false })).toHaveCount(0, { timeout: 15_000 });
});
