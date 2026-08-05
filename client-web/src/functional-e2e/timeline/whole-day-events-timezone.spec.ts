// Feature: whole-day calendar events display on the correct date for EVERY viewer
// timezone — server#6279 (follow-up of #6271, closes server#6267).
// Spec: agents-hq `specs/023-wholeday-calendar-timezone/`
//
// This is the UI half of the story's QA plan. The API half lives in
// `server-api/src/functional-api/calendar/calendar-event-wholeday-timezone.it-spec.ts`
// and pins the wire contract (DTSTART/DTEND, exclusive end, duration semantics).
// What can ONLY be checked here is what a viewer actually SEES:
//
//   UI-A  a whole-day event shows its picked date in EVERY browser timezone
//         (QA plan A1/A5/A6/A7/A8 — the reported bug)
//   UI-C1 a multi-day event highlights EXACTLY its covered days in the grid
//         (QA plan C1 — the scope-creep double-count bug: 2-day span lit 5 cells)
//   UI-D1 toggling "Whole day" REMOVES Start time / End time / Duration
//         (QA plan D1 — whole-day events have no time-of-day)
//
// Timezone note: the browser timezone is what matters here, and Playwright sets it
// per BrowserContext (`timezoneId`). The shared `authenticated-session.fixture`
// creates one context with no timezone control, so this suite logs in once to
// harvest a storageState and then builds its own per-timezone contexts from it,
// rather than changing a fixture other suites depend on.
//
// Events are created through the API (the same UTC-midnight wire convention the
// fixed client writes) so that these tests isolate the RENDERING path. Form
// behaviour that writes is covered by UI-D1 plus the client unit suites
// (`useCrdEventForm.test.ts`, `useCrdEventFormDialog.toDomainPayload.test.ts`).

import { TestUser } from '@alkemio/tests-lib/common/enums/test.user';
import { TestScenarioConfig } from '@alkemio/tests-lib/scenario/config/test-scenario-config';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { TestScenarioFactory } from '@alkemio/tests-lib/scenario/TestScenarioFactory';
import { TestUserManager, getGraphqlClient } from '@alkemio/tests-lib';
import { CalendarEventType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { ensurePersonaState } from '@src/functional-e2e/fixtures/authenticated-session.fixture';
import { CalendarEventFormPage, dateLabelRe } from './pages/CalendarEventFormPage';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
// Resolved in beforeAll to the shared per-persona session (login happens at
// most once per user per run — see authenticated-session.fixture).
let storageStatePath: string;

// Events live in NEXT year so the seeded dates and the grid month stay in the
// future regardless of when the nightly runs (a hardcoded year silently expires).
const YEAR = new Date().getFullYear() + 1;
/** 3 Dec of YEAR — the single-day event; and the day before, for the off-by-one guard. */
const DEC_3 = new Date(YEAR, 11, 3);
const DEC_2 = new Date(YEAR, 11, 2);
/** 23 Jul of YEAR — start of the 3-covered-day multi-day event. */
const JUL_23 = new Date(YEAR, 6, 23);

/** UTC-midnight wire value for a picked calendar date — what the fixed client sends. */
const wholeDayWire = (y: number, m: number, d: number): Date =>
  new Date(Date.UTC(y, m - 1, d));

/**
 * Browser timezones from the QA plan's setup section. Sofia is the reported case,
 * Amsterdam is the NL userbase (also broken before the fix), Honolulu is far west,
 * UTC is the case that already worked and must not regress.
 */
const VIEWER_TIMEZONES = [
  'Europe/Sofia',
  'Europe/Amsterdam',
  'Pacific/Honolulu',
  'UTC',
] as const;

const scenarioConfig: TestScenarioConfig = {
  // Per-run suffix so a retry / incomplete prior cleanup cannot collide on the
  // space nameId (matches the API spec's cal-wd-tz-${uniqueId} convention).
  name: `whole-day-tz-${Date.now()}`,
  space: {
    about: { profile: { displayName: 'Whole Day TZ Test Space' } },
    collaboration: {
      addTutorialCallouts: false,
      addPostCollectionCallout: false,
      addWhiteboardCallout: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

let baseScenario: OrganizationWithSpaceModel;
let calendarUrl: string;

/** The single-day event under test: whole-day 3 Dec 2026 (QA plan A1). */
const SINGLE_DAY_TITLE = `WholeDay Dec ${Date.now()}`;
/** The multi-day event under test: 23 -> 25 July 2026, i.e. 3 covered days (QA plan C1). */
const MULTI_DAY_TITLE = `WholeDay MultiDay ${Date.now()}`;

const createWholeDayEvent = async (
  calendarId: string,
  authToken: string,
  displayName: string,
  startWire: Date,
  durationMinutes: number,
  durationDays: number,
  multipleDays: boolean
): Promise<void> => {
  const client = getGraphqlClient();
  await client.CreateCalendarEventOnCalendar(
    {
      eventData: {
        calendarID: calendarId,
        profileData: { displayName, description: 'whole-day timezone rendering' },
        startDate: startWire,
        durationMinutes,
        durationDays,
        multipleDays,
        wholeDay: true,
        type: CalendarEventType.Other,
        visibleOnParentCalendar: true,
      },
    },
    { authorization: `Bearer ${authToken}` }
  );
};

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);

  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const admin = TestUserManager.users.spaceAdmin;
  const client = getGraphqlClient();
  const calendarRes = await client.GetSpaceCalendarId(
    { spaceId: baseScenario.space.id },
    { authorization: `Bearer ${admin.authToken}` }
  );
  const calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ?? '';
  expect(calendarId, 'space calendar id').not.toBe('');

  // 3 Dec, single day (durationMinutes 0 => End === Start).
  await createWholeDayEvent(
    calendarId, admin.authToken, SINGLE_DAY_TITLE, wholeDayWire(YEAR, 12, 3), 0, 0, false
  );
  // 23 -> 25 July: offset of 2 days, so 3 covered days.
  await createWholeDayEvent(
    calendarId, admin.authToken, MULTI_DAY_TITLE, wholeDayWire(YEAR, 7, 23), 2880, 2, true
  );

  calendarUrl = `${baseUrl}/${baseScenario.space.nameId}/calendar`;

  // Reuse the shared spaceAdmin session (logs in once per run, cached to disk);
  // every timezone context below is built from this storage state.
  storageStatePath = await ensurePersonaState(
    browser,
    TestUserManager.users.spaceAdmin.email
  );
});

test.afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

const openCalendarIn = async (
  browser: Browser,
  timezoneId: string
): Promise<BrowserContext> => {
  const context = await browser.newContext({ storageState: storageStatePath, timezoneId });
  const page = await context.newPage();
  await page.goto(calendarUrl);
  await page.waitForLoadState('networkidle');
  return context;
};

// --- UI-A: the reported bug, at the layer the user actually sees ------------
for (const timezoneId of VIEWER_TIMEZONES) {
  test(`UI-A: a whole-day 3 Dec event displays as 3 December for a viewer in ${timezoneId}`, async ({
    browser,
  }) => {
    const context = await openCalendarIn(browser, timezoneId);
    const page = context.pages()[0];

    try {
      const card = page.getByText(SINGLE_DAY_TITLE, { exact: false }).first();
      await expect(card, `event visible in ${timezoneId}`).toBeVisible({ timeout: 15_000 });

      // EventDateBadge exposes the whole date as an aria-label (role="img") formatted
      // with date-fns 'PPP' — e.g. "December 3rd, <YEAR>". A day-shift regression shows
      // up here as December 2nd for viewers east of UTC.
      const badge = page.getByRole('img', { name: dateLabelRe(DEC_3) }).first();
      await expect(
        badge,
        `whole-day badge must read 3 December in ${timezoneId}, never 2 December`
      ).toBeVisible({ timeout: 15_000 });

      // Explicitly assert the off-by-one day is ABSENT, so a badge that renders both
      // (or the wrong one) cannot pass.
      await expect(
        page.getByRole('img', { name: dateLabelRe(DEC_2) }),
        `no 2 December badge may appear in ${timezoneId}`
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}

// --- UI-C1: multi-day span covers exactly its days -------------------------
test('UI-C1: a 23->25 July whole-day event highlights exactly 3 calendar cells', async ({
  browser,
}) => {
  // Timezone-neutral assertion; Sofia is used because it is the reported case.
  const context = await openCalendarIn(browser, 'Europe/Sofia');
  const page = context.pages()[0];

  try {
    await expect(page.getByText(MULTI_DAY_TITLE, { exact: false }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Navigate the grid to the event's month (July of YEAR), stepping either way.
    const july = await new CalendarEventFormPage(page, baseUrl).monthGrid(JUL_23);

    // EventsCalendarView marks every covered day (eventStart | eventBetween | eventEnd)
    // with the shared `bg-primary/20` highlight class. Counting those cells is the
    // rendered equivalent of "how many days does this event cover".
    // NOTE: this couples to a styling class because that class IS how the component
    // expresses coverage; if the highlight styling is renamed, update this selector.
    const highlighted = july.locator('[class*="bg-primary/20"]');

    // The old durationDays double-count rendered a 2-day offset as 5 cells (23-27).
    await expect(
      highlighted,
      'a 23->25 July whole-day event must cover exactly 23, 24, 25'
    ).toHaveCount(3);

    for (const day of ['23', '24', '25']) {
      await expect(
        july.getByRole('gridcell', { name: new RegExp(`\\b${day}\\b`) }).first(),
        `July ${day} present`
      ).toBeVisible();
    }
  } finally {
    await context.close();
  }
});

// --- UI-D1: whole-day events have no time-of-day ---------------------------
test('UI-D1: toggling "Whole day" removes Start time, End time and Duration', async ({
  browser,
}) => {
  const context = await openCalendarIn(browser, 'Europe/Sofia');
  const page = context.pages()[0];

  try {
    await page.getByRole('button', { name: 'Add event' }).first().click();

    const startTime = page.getByLabel('Start time');
    const endTime = page.getByLabel('End time');
    const duration = page.getByLabel('Duration');
    const wholeDay = page.getByLabel('Whole day');

    await expect(wholeDay, 'whole-day toggle').toBeVisible({ timeout: 10_000 });
    // Timed event: the time fields are present.
    await expect(startTime, 'timed event shows Start time').toBeVisible();

    await wholeDay.click();

    // The QA plan is explicit: the fields must DISAPPEAR, not merely be disabled —
    // a disabled "Duration: 2 HOURS - ends at 2:00 AM" was the reported defect.
    await expect(startTime, 'Start time removed for whole-day').toHaveCount(0);
    await expect(endTime, 'End time removed for whole-day').toHaveCount(0);
    await expect(duration, 'Duration removed for whole-day').toHaveCount(0);

    // Only the date range remains.
    await expect(page.getByLabel('Start date')).toBeVisible();
    await expect(page.getByLabel('End date')).toBeVisible();
  } finally {
    await context.close();
  }
});
