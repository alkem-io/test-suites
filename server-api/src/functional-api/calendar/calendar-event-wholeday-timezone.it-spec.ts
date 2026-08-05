import {
  TestScenarioConfig,
  TestScenarioFactory,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { TestUser } from '@alkemio/tests-lib';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { CalendarEventType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  createCalendarEventOnCalendar,
  deleteCalendarEvent,
  downloadIcsFile,
  getCalendarEventById,
  getSpaceCalendarId,
  updateCalendarEvent,
} from './calendar.request.params';

/**
 * Whole-day calendar events must export on the PICKED calendar date for every
 * viewer and every server timezone — server#6279 (follow-up of #6271, closes
 * server#6267). Workspace spec: agents-hq `specs/023-wholeday-calendar-timezone/`.
 *
 * The contract under test (ADR 0001, whole-day UTC-midnight):
 *   - a whole-day event's `startDate` on the wire is UTC-midnight of the intended
 *     date; the client sends it that way and must never re-project a local offset;
 *   - `DTSTART;VALUE=DATE` equals that date;
 *   - the whole-day end is the RFC 5545 EXCLUSIVE end (last covered day + 1), in
 *     ICS, the Google link and the Outlook link alike;
 *   - `durationMinutes` for a whole-day event is the End−Start date offset, so a
 *     single-day whole-day event is 0 (NOT a zero-length event — its exclusive
 *     +1 day at export makes it cover one full day).
 *
 * Coverage note (deliberate, do not "fix" by deleting): these tests pin the wire
 * convention, the exclusive end, and the duration semantics. They do NOT by
 * themselves prove timezone-INDEPENDENCE, because CI and the deployed servers run
 * UTC, where local-parts and UTC-parts derivation coincide — the exact blind spot
 * that let server#6271 ship while still broken. That proof lives in the server
 * repo's `calendar.event.calendar-links.wholeday-tz.harness.spec.ts`, which re-runs
 * its spec under a west-of-UTC process. Keep both.
 *
 * Prior gap this file closes: the existing whole-day export test asserted only that
 * the URLs were *defined*, never the dates they carried — so it could not have
 * caught server#6267 and could not catch a regression of it.
 */

const uniqueId = UniqueIDGenerator.getID();
let baseScenario: OrganizationWithSpaceModel;
let calendarId: string;

/** UTC-midnight wire value for a picked calendar date — what the fixed client sends. */
const wholeDayWire = (y: number, m: number, d: number): string =>
  new Date(Date.UTC(y, m - 1, d)).toISOString();

/** `YYYYMMDD` occurrences in an ICS body for a given property. */
const icsDateOnly = (body: string, prop: 'DTSTART' | 'DTEND'): string | undefined =>
  body.match(new RegExp(`${prop};VALUE=DATE:(\\d{8})`))?.[1];

const scenarioConfig: TestScenarioConfig = {
  name: `cal-wd-tz-${uniqueId}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
    community: {
      admins: [TestUser.SPACE_ADMIN],
      members: [TestUser.SPACE_ADMIN],
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const calendarRes = await getSpaceCalendarId(baseScenario.space.id);
  calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ?? '';
  expect(calendarId).not.toBe('');
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Whole-day calendar events - export date correctness (server#6279)', () => {
  const createdEventIds: string[] = [];

  const createWholeDay = async (
    displayName: string,
    startWire: string,
    durationMinutes: number,
    durationDays: number,
    multipleDays: boolean
  ): Promise<string> => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `${displayName} ${uniqueId}`,
      description: 'whole-day export date coverage',
      startDate: startWire,
      durationMinutes,
      durationDays,
      multipleDays,
      wholeDay: true,
      type: CalendarEventType.Other,
    });
    const id = res.data?.createEventOnCalendar?.id;
    expect(id).toBeDefined();
    createdEventIds.push(id!);
    return id!;
  };

  afterAll(async () => {
    for (const id of createdEventIds) await deleteCalendarEvent(id);
  });

  // --- QA plan A1-A7 / SC-001 / SC-002 -------------------------------------
  test('A: a 3->4 Dec whole-day event exports DTSTART 20261203 and exclusive DTEND 20261205', async () => {
    const eventId = await createWholeDay(
      'WholeDay Dec',
      wholeDayWire(2026, 12, 3),
      1440, // End - Start = 1 day offset => covers 2 days (3 + 4 Dec)
      1,
      true // a 2-covered-day whole-day event is multi-day (durationDays > 0)
    );

    const ics = await downloadIcsFile(eventId, TestUser.SPACE_ADMIN);
    expect(ics.status).toBe(200);

    // The picked day, not its neighbour.
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20261203');
    // RFC 5545 exclusive end: last covered day (4 Dec) + 1.
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20261205');
    // A whole-day event must be a DATE, never a timed instant.
    expect(ics.body).not.toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });

  test('A: the Google and Outlook links carry the same picked dates', async () => {
    const eventId = await createWholeDay(
      'WholeDay Links',
      wholeDayWire(2026, 12, 3),
      1440, // covers 2 days (3 + 4 Dec)
      1,
      true
    );

    const res = await getCalendarEventById(eventId);
    const event = res.data?.lookup?.calendarEvent;

    const google = new URL(event!.googleCalendarUrl!);
    expect(google.searchParams.get('dates')).toBe('20261203/20261205');

    const outlook = new URL(event!.outlookCalendarUrl!);
    expect(outlook.searchParams.get('startdt')).toBe('2026-12-03');
    expect(outlook.searchParams.get('enddt')).toBe('2026-12-05');
    expect(event!.outlookCalendarUrl).toContain('allday=true');
  });

  // --- QA plan B1 ----------------------------------------------------------
  test('B1: a single-day whole-day event is valid and covers exactly one day', async () => {
    // durationMinutes 0 => End === Start. Previously rejected by the
    // start >= end validation, which broke creation outright.
    const eventId = await createWholeDay(
      'WholeDay Single',
      wholeDayWire(2026, 7, 20),
      0,
      0,
      false
    );

    const res = await getCalendarEventById(eventId);
    expect(res.data?.lookup?.calendarEvent?.durationMinutes).toBe(0);

    const ics = await downloadIcsFile(eventId, TestUser.SPACE_ADMIN);
    expect(ics.status).toBe(200);
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20260720');
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20260721');
  });

  // --- QA plan B2 ----------------------------------------------------------
  test('B2: a whole-day event across the year boundary exports correctly', async () => {
    const eventId = await createWholeDay(
      'WholeDay NewYear',
      wholeDayWire(2026, 12, 31),
      1440, // covers 2 days: 31 Dec 2026 + 1 Jan 2027
      1,
      true
    );

    const ics = await downloadIcsFile(eventId, TestUser.SPACE_ADMIN);
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20261231');
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20270102');
  });

  // --- QA plan B3 / SC-004 -------------------------------------------------
  test('B3: a whole-day span across the EU spring-forward keeps an exact day count', async () => {
    // 28 -> 30 March 2026 (DST transition on 29 March): 3 covered days.
    const eventId = await createWholeDay(
      'WholeDay DST',
      wholeDayWire(2026, 3, 28),
      2880, // 2 days offset
      2,
      true
    );

    const ics = await downloadIcsFile(eventId, TestUser.SPACE_ADMIN);
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20260328');
    // No ±1 drift from a DST hour: UTC date arithmetic has no DST.
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20260331');
  });

  // --- QA plan C1 ----------------------------------------------------------
  test('C1: a 23->25 July whole-day event covers exactly 3 days', async () => {
    const eventId = await createWholeDay(
      'WholeDay MultiDay',
      wholeDayWire(2026, 7, 23),
      2880,
      2,
      true
    );

    const res = await getCalendarEventById(eventId);
    const event = res.data?.lookup?.calendarEvent;
    // durationMinutes is authoritative and already holds the full span;
    // durationDays is derived and must never be added on top of it.
    expect(event?.durationMinutes).toBe(2880);
    expect(event?.durationDays).toBe(2);

    const ics = await downloadIcsFile(eventId, TestUser.SPACE_ADMIN);
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20260723');
    // Covers 23,24,25 -> exclusive end 26. The old double-count produced 20260728.
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20260726');
  });
});

describe('Whole-day calendar events - update semantics (server#6279)', () => {
  let shrinkEventId: string;

  afterAll(async () => {
    if (shrinkEventId) await deleteCalendarEvent(shrinkEventId);
  });

  // --- QA plan D2 / US5 / FR-012 -------------------------------------------
  test('D2: narrowing a 4-day whole-day event to a single day persists', async () => {
    const created = await createCalendarEventOnCalendar(calendarId, {
      displayName: `WholeDay Shrink ${uniqueId}`,
      description: 'shrink multi-day to single day',
      startDate: wholeDayWire(2026, 7, 20),
      durationMinutes: 5760, // 4 days
      durationDays: 4,
      multipleDays: true,
      wholeDay: true,
      type: CalendarEventType.Other,
    });
    shrinkEventId = created.data?.createEventOnCalendar?.id ?? '';
    expect(shrinkEventId).not.toBe('');

    // Narrow to a single day: End === Start, so durationMinutes/durationDays are 0.
    // These MUST be applied — a falsy-guarded update silently kept the old 4-day span.
    await updateCalendarEvent(shrinkEventId, {
      startDate: wholeDayWire(2026, 7, 20),
      durationMinutes: 0,
      durationDays: 0,
      multipleDays: false,
      wholeDay: true,
    });

    const res = await getCalendarEventById(shrinkEventId);
    const event = res.data?.lookup?.calendarEvent;
    expect(event?.durationMinutes).toBe(0);
    expect(event?.durationDays).toBe(0);
    expect(event?.multipleDays).toBe(false);

    const ics = await downloadIcsFile(shrinkEventId, TestUser.SPACE_ADMIN);
    expect(icsDateOnly(ics.body, 'DTSTART')).toBe('20260720');
    expect(icsDateOnly(ics.body, 'DTEND')).toBe('20260721');
  });
});

describe('Timed calendar events - regression guards (server#6279)', () => {
  const timedEventIds: string[] = [];

  afterAll(async () => {
    for (const id of timedEventIds) await deleteCalendarEvent(id);
  });

  // --- QA plan E1 ----------------------------------------------------------
  test('E1: a timed event still exports a real UTC instant, not a DATE', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Timed Regression ${uniqueId}`,
      description: 'timed events must be unchanged',
      startDate: '2026-04-15T14:00:00.000Z',
      durationMinutes: 120,
      durationDays: 0,
      multipleDays: false,
      wholeDay: false,
      type: CalendarEventType.Other,
    });
    const eventId = res.data?.createEventOnCalendar?.id;
    expect(eventId).toBeDefined();
    timedEventIds.push(eventId!);

    const ics = await downloadIcsFile(eventId!, TestUser.SPACE_ADMIN);
    expect(ics.status).toBe(200);
    // A timed event is an instant: it must NOT be exported as a bare date.
    expect(ics.body).not.toMatch(/DTSTART;VALUE=DATE:/);
    expect(ics.body).toMatch(/DTSTART:20260415T140000Z/);
  });

  // --- QA plan E5 ----------------------------------------------------------
  test('E5: a title-only edit leaves a timed event duration and start untouched', async () => {
    const created = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Timed NoOp ${uniqueId}`,
      description: 'title-only edit must not alter dates',
      startDate: '2026-05-10T09:30:00.000Z',
      durationMinutes: 90,
      durationDays: 0,
      multipleDays: false,
      wholeDay: false,
      type: CalendarEventType.Other,
    });
    const eventId = created.data?.createEventOnCalendar?.id;
    expect(eventId).toBeDefined();
    timedEventIds.push(eventId!);

    const before = await getCalendarEventById(eventId!);
    const beforeEvent = before.data?.lookup?.calendarEvent;

    // NOTE: `updateCalendarEvent` requires startDate/durationMinutes/multipleDays/
    // wholeDay, so a literal title-only mutation is not expressible through this
    // helper. Echoing the current values back is the closest faithful equivalent and
    // still exercises the actual risk: the server assigns durationMinutes/durationDays
    // unconditionally, so a no-op edit must not zero or alter them.
    await updateCalendarEvent(eventId!, {
      displayName: `Timed NoOp renamed ${uniqueId}`,
      startDate: beforeEvent!.startDate,
      durationMinutes: beforeEvent!.durationMinutes,
      durationDays: beforeEvent!.durationDays,
      multipleDays: beforeEvent!.multipleDays,
      wholeDay: beforeEvent!.wholeDay,
    });

    const after = await getCalendarEventById(eventId!);
    const afterEvent = after.data?.lookup?.calendarEvent;

    // The server now assigns durationMinutes/durationDays unconditionally, so a
    // no-op edit must not zero or otherwise alter them.
    expect(afterEvent?.durationMinutes).toBe(beforeEvent?.durationMinutes);
    expect(afterEvent?.durationDays).toBe(beforeEvent?.durationDays);
    expect(afterEvent?.startDate).toBe(beforeEvent?.startDate);
    expect(afterEvent?.wholeDay).toBe(false);
  });
});
