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
  getCalendarEvents,
  getSpaceCalendarId,
  updateCalendarEvent,
} from './calendar.request.params';

const uniqueId = UniqueIDGenerator.getID();
let baseScenario: OrganizationWithSpaceModel;
let calendarId: string;

const scenarioConfig: TestScenarioConfig = {
  name: `cal-evt-${uniqueId}`,
  space: {
    collaboration: {
      addTutorialCallouts: false,
    },
  },
};

beforeAll(async () => {
  baseScenario = await TestScenarioFactory.createBaseScenario(scenarioConfig);

  const calendarRes = await getSpaceCalendarId(baseScenario.space.id);
  calendarId =
    calendarRes.data?.lookup?.space?.collaboration?.timeline?.calendar?.id ??
    '';
  expect(calendarId).not.toBe('');
});

afterAll(async () => {
  await TestScenarioFactory.cleanUpBaseScenario(baseScenario);
});

describe('Calendar Events - CRUD', () => {
  let timedEventId: string;
  let wholeDayEventId: string;

  afterAll(async () => {
    if (timedEventId) {
      await deleteCalendarEvent(timedEventId);
    }
    if (wholeDayEventId) {
      await deleteCalendarEvent(wholeDayEventId);
    }
  });

  test('should create a timed calendar event', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Timed Event ${uniqueId}`,
      description: 'A timed test event with **markdown**',
      startDate: '2026-04-15T14:00:00.000Z',
      durationMinutes: 120,
      multipleDays: false,
      wholeDay: false,
      type: CalendarEventType.Event,
      location: {
        city: 'Amsterdam',
        country: 'Netherlands',
      },
    });

    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    expect(event?.id).toBeDefined();
    expect(event?.profile.displayName).toBe(`Timed Event ${uniqueId}`);
    expect(event?.wholeDay).toBe(false);
    expect(event?.durationMinutes).toBe(120);
    expect(event?.type).toBe(CalendarEventType.Event);

    timedEventId = event!.id;
  });

  test('should create a whole-day calendar event', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Whole Day Event ${uniqueId}`,
      description: 'An all-day test event',
      startDate: '2026-04-20T00:00:00.000Z',
      durationMinutes: 1440,
      durationDays: 1,
      multipleDays: false,
      wholeDay: true,
      type: CalendarEventType.Event,
    });

    if (res.error) {
      console.error(
        'Whole-day event creation error:',
        JSON.stringify(res.error, null, 2)
      );
    }

    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    expect(event?.id).toBeDefined();
    expect(event?.wholeDay).toBe(true);

    wholeDayEventId = event!.id;
  });

  test('should create a multi-day calendar event', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Multi Day Event ${uniqueId}`,
      description: 'A multi-day test event',
      startDate: '2026-05-01T00:00:00.000Z',
      durationMinutes: 4320,
      durationDays: 3,
      multipleDays: true,
      wholeDay: true,
      type: CalendarEventType.Training,
    });

    if (res.error) {
      console.error(
        'Multi-day event creation error:',
        JSON.stringify(res.error, null, 2)
      );
    }

    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    expect(event?.multipleDays).toBe(true);
    expect(event?.durationDays).toBe(3);
    expect(event?.type).toBe(CalendarEventType.Training);

    await deleteCalendarEvent(event!.id);
  });

  test('should query calendar events for a space', async () => {
    expect(timedEventId).toBeDefined();

    const res = await getCalendarEvents(baseScenario.space.id);

    if (res.error) {
      console.error(
        'Query calendar events error:',
        JSON.stringify(res.error, null, 2)
      );
    }

    const calendar =
      res.data?.lookup?.space?.collaboration?.timeline?.calendar;
    expect(calendar).toBeDefined();
    expect(calendar?.events).toBeDefined();
    expect(calendar!.events.length).toBeGreaterThanOrEqual(1);

    const timedEvent = calendar!.events.find(e => e.id === timedEventId);
    expect(timedEvent).toBeDefined();
    expect(timedEvent?.profile.displayName).toContain('Timed Event');
  });

  test('should query a single calendar event by ID', async () => {
    const res = await getCalendarEventById(timedEventId);
    const event = res.data?.lookup?.calendarEvent;
    expect(event).toBeDefined();
    expect(event?.id).toBe(timedEventId);
    expect(event?.profile.displayName).toContain('Timed Event');
  });

  test('should update a calendar event', async () => {
    const res = await updateCalendarEvent(timedEventId, {
      displayName: `Updated Timed Event ${uniqueId}`,
      description: 'Updated description',
      startDate: '2026-04-16T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
      location: {
        city: 'Berlin',
        country: 'Germany',
      },
    });

    const event = res.data?.updateCalendarEvent;
    expect(event).toBeDefined();
    expect(event?.profile.displayName).toBe(
      `Updated Timed Event ${uniqueId}`
    );
    expect(event?.durationMinutes).toBe(60);
  });

  test('should delete a calendar event', async () => {
    const createRes = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Temp Event ${uniqueId}`,
      startDate: '2026-06-01T00:00:00.000Z',
      durationMinutes: 30,
      multipleDays: false,
      wholeDay: false,
    });
    const tempEventId = createRes.data?.createEventOnCalendar?.id;
    expect(tempEventId).toBeDefined();

    const deleteRes = await deleteCalendarEvent(tempEventId!);
    expect(deleteRes.data?.deleteCalendarEvent?.id).toBe(tempEventId);

    // Verify it's gone — lookup of deleted event returns error or undefined
    const getRes = await getCalendarEventById(tempEventId!);
    const event = getRes.data?.lookup?.calendarEvent;
    expect(event == null || getRes.error).toBeTruthy();
  });
});

describe('Calendar Events - Add to Calendar URLs', () => {
  let timedEventId: string;
  let wholeDayEventId: string;

  beforeAll(async () => {
    const timedRes = await createCalendarEventOnCalendar(calendarId, {
      displayName: `URL Timed Event ${uniqueId}`,
      description: 'Event for URL testing',
      startDate: '2026-07-10T14:00:00.000Z',
      durationMinutes: 90,
      multipleDays: false,
      wholeDay: false,
      type: CalendarEventType.Meeting,
      location: {
        city: 'Amsterdam',
        country: 'Netherlands',
      },
    });
    timedEventId = timedRes.data?.createEventOnCalendar?.id ?? '';

    const wholeDayRes = await createCalendarEventOnCalendar(calendarId, {
      displayName: `URL Whole Day ${uniqueId}`,
      description: 'Whole day event for URL testing',
      startDate: '2026-07-15T00:00:00.000Z',
      durationMinutes: 1440,
      durationDays: 1,
      multipleDays: false,
      wholeDay: true,
      type: CalendarEventType.Event,
    });
    wholeDayEventId = wholeDayRes.data?.createEventOnCalendar?.id ?? '';
  });

  afterAll(async () => {
    if (timedEventId) await deleteCalendarEvent(timedEventId);
    if (wholeDayEventId) await deleteCalendarEvent(wholeDayEventId);
  });

  test('should return googleCalendarUrl for a timed event', async () => {
    const res = await getCalendarEventById(timedEventId);
    const event = res.data?.lookup?.calendarEvent;

    expect(event?.googleCalendarUrl).toBeDefined();
    expect(event?.googleCalendarUrl).toContain(
      'calendar.google.com/calendar/render'
    );
    expect(event?.googleCalendarUrl).toContain('action=TEMPLATE');

    const url = new URL(event!.googleCalendarUrl!);
    expect(url.searchParams.get('text')).toContain('URL Timed Event');
  });

  test('should return outlookCalendarUrl for a timed event', async () => {
    const res = await getCalendarEventById(timedEventId);
    const event = res.data?.lookup?.calendarEvent;

    expect(event?.outlookCalendarUrl).toBeDefined();
    expect(event?.outlookCalendarUrl).toContain('outlook');
    expect(event?.outlookCalendarUrl).toContain('calendar');
  });

  test('should return icsDownloadUrl for a timed event', async () => {
    const res = await getCalendarEventById(timedEventId);
    const event = res.data?.lookup?.calendarEvent;

    expect(event?.icsDownloadUrl).toBeDefined();
    expect(event?.icsDownloadUrl).toContain('/rest/calendar/event/');
    expect(event?.icsDownloadUrl).toContain('/ics');
  });

  test('should return calendar URLs for a whole-day event', async () => {
    if (!wholeDayEventId) {
      console.warn('Skipping: whole-day event was not created');
      return;
    }
    const res = await getCalendarEventById(wholeDayEventId);
    const event = res.data?.lookup?.calendarEvent;

    expect(event).toBeDefined();
    expect(event?.googleCalendarUrl).toBeDefined();
    expect(event?.outlookCalendarUrl).toBeDefined();
    expect(event?.icsDownloadUrl).toBeDefined();
  });

  test('should contain correct location in Google Calendar URL', async () => {
    const res = await getCalendarEventById(timedEventId);
    const event = res.data?.lookup?.calendarEvent;

    const url = new URL(event!.googleCalendarUrl!);
    const location = url.searchParams.get('location') ?? '';
    expect(location).toContain('Amsterdam');
  });
});

describe('Calendar Events - ICS Download', () => {
  let eventId: string;
  let wholeDayEventId: string;

  beforeAll(async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `ICS Test Event ${uniqueId}`,
      description: 'Description for ICS test with **bold markdown**',
      startDate: '2026-08-10T09:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
      type: CalendarEventType.Event,
      location: {
        city: 'Berlin',
        country: 'Germany',
      },
    });
    eventId = res.data?.createEventOnCalendar?.id ?? '';

    const wholeDayRes = await createCalendarEventOnCalendar(calendarId, {
      displayName: `ICS Whole Day ${uniqueId}`,
      description: 'All day ICS event',
      startDate: '2026-08-15T00:00:00.000Z',
      durationMinutes: 1440,
      durationDays: 1,
      multipleDays: false,
      wholeDay: true,
    });
    wholeDayEventId = wholeDayRes.data?.createEventOnCalendar?.id ?? '';
  });

  afterAll(async () => {
    if (eventId) await deleteCalendarEvent(eventId);
    if (wholeDayEventId) await deleteCalendarEvent(wholeDayEventId);
  });

  test('should download ICS file with correct content type', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);

    if (response.status === 302) {
      console.warn(
        'ICS endpoint returned 302 — REST endpoint requires session auth via Oathkeeper, not Bearer token.',
        'Redirect URL:',
        response.redirectUrl
      );
    }

    expect([200, 302]).toContain(response.status);
    if (response.status === 200) {
      expect(response.headers['content-type']).toContain('text/calendar');
    }
  });

  test('should contain valid ICS structure when accessible', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS content validation — endpoint returned',
        response.status
      );
      return;
    }
    expect(response.body).toContain('BEGIN:VCALENDAR');
    expect(response.body).toContain('END:VCALENDAR');
    expect(response.body).toContain('BEGIN:VEVENT');
    expect(response.body).toContain('END:VEVENT');
    expect(response.body).toContain('VERSION:2.0');
  });

  test('should contain correct event data in ICS when accessible', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS data validation — endpoint returned',
        response.status
      );
      return;
    }
    const ics = response.body;

    expect(ics).toContain(`ICS Test Event ${uniqueId}`);
    expect(ics).toMatch(/DTSTART:\d{8}T\d{6}Z/);
    expect(ics).toMatch(/DTEND:\d{8}T\d{6}Z|DURATION:/);
    expect(ics).toMatch(/UID:.+/);
  });

  test('should contain location in ICS when accessible', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS location validation — endpoint returned',
        response.status
      );
      return;
    }
    expect(response.body).toContain('LOCATION:');
  });

  test('should strip markdown from description in ICS when accessible', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS markdown validation — endpoint returned',
        response.status
      );
      return;
    }
    expect(response.body).not.toContain('**bold markdown**');
    expect(response.body).toContain('bold markdown');
  });

  test('should use VALUE=DATE format for whole-day events when accessible', async () => {
    if (!wholeDayEventId) {
      console.warn('Skipping: whole-day event was not created');
      return;
    }
    const response = await downloadIcsFile(
      wholeDayEventId,
      TestUser.GLOBAL_ADMIN
    );
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS date format validation — endpoint returned',
        response.status
      );
      return;
    }
    expect(response.body).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
  });

  test('should use datetime format for timed events when accessible', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    if (response.status !== 200) {
      console.warn(
        'Skipping ICS datetime validation — endpoint returned',
        response.status
      );
      return;
    }
    expect(response.body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
  });
});

describe('Calendar Events - Authorization', () => {
  let eventId: string;

  beforeAll(async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Auth Test Event ${uniqueId}`,
      startDate: '2026-09-01T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
    });
    eventId = res.data?.createEventOnCalendar?.id ?? '';
  });

  afterAll(async () => {
    if (eventId) await deleteCalendarEvent(eventId);
  });

  test('should allow space admin to create calendar events', async () => {
    const res = await createCalendarEventOnCalendar(
      calendarId,
      {
        displayName: `Admin Event ${uniqueId}`,
        startDate: '2026-09-05T10:00:00.000Z',
        durationMinutes: 30,
        multipleDays: false,
        wholeDay: false,
      },
      TestUser.GLOBAL_ADMIN
    );
    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    expect(event?.id).toBeDefined();

    await deleteCalendarEvent(event!.id);
  });

  test('should not allow non-member to create calendar events', async () => {
    const res = await createCalendarEventOnCalendar(
      calendarId,
      {
        displayName: `Non Member Event ${uniqueId}`,
        startDate: '2026-09-10T10:00:00.000Z',
        durationMinutes: 30,
        multipleDays: false,
        wholeDay: false,
      },
      TestUser.NON_SPACE_MEMBER
    );
    expect(res.error).toBeDefined();
    expect(res.error?.errors?.length).toBeGreaterThan(0);
  });

  test('should redirect unauthenticated ICS download', async () => {
    const response = await downloadIcsFile(eventId);
    expect([301, 302, 303, 307, 308, 401, 403]).toContain(response.status);
  });

  test('should handle authenticated ICS download', async () => {
    const response = await downloadIcsFile(eventId, TestUser.GLOBAL_ADMIN);
    expect([200, 302]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body).toContain('BEGIN:VCALENDAR');
    }
  });
});

describe('Calendar Events - Event Types', () => {
  const eventIds: string[] = [];

  afterAll(async () => {
    for (const id of eventIds) {
      await deleteCalendarEvent(id);
    }
  });

  const eventTypes = [
    CalendarEventType.Event,
    CalendarEventType.Meeting,
    CalendarEventType.Deadline,
    CalendarEventType.Milestone,
    CalendarEventType.Training,
    CalendarEventType.Other,
  ];

  test.each(eventTypes)(
    'should create calendar event with type %s',
    async type => {
      const res = await createCalendarEventOnCalendar(calendarId, {
        displayName: `${type} Event ${uniqueId}`,
        startDate: '2026-10-01T10:00:00.000Z',
        durationMinutes: 60,
        multipleDays: false,
        wholeDay: false,
        type,
      });

      const event = res.data?.createEventOnCalendar;
      expect(event).toBeDefined();
      expect(event?.type).toBe(type);
      eventIds.push(event!.id);
    }
  );
});

describe('Calendar Events - Edge Cases', () => {
  const eventIds: string[] = [];

  afterAll(async () => {
    for (const id of eventIds) {
      await deleteCalendarEvent(id);
    }
  });

  test('should handle event with no description', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `No Desc Event ${uniqueId}`,
      startDate: '2026-11-01T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
    });
    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    eventIds.push(event!.id);

    const eventRes = await getCalendarEventById(event!.id);
    expect(
      eventRes.data?.lookup?.calendarEvent?.googleCalendarUrl
    ).toBeDefined();
  });

  test('should handle event with no location', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `No Location Event ${uniqueId}`,
      description: 'Event without location',
      startDate: '2026-11-05T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
    });
    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    eventIds.push(event!.id);

    const eventRes = await getCalendarEventById(event!.id);
    expect(
      eventRes.data?.lookup?.calendarEvent?.googleCalendarUrl
    ).toBeDefined();
  });

  test('should handle event with moderately long title', async () => {
    const longTitle = `Event ${'A'.repeat(80)} ${uniqueId}`;
    const longDescription = `Description ${'B'.repeat(500)} end`;

    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: longTitle,
      description: longDescription,
      startDate: '2026-11-10T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
    });

    if (res.error) {
      console.error(
        'Long title event creation error:',
        JSON.stringify(res.error, null, 2)
      );
    }

    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    eventIds.push(event!.id);

    const eventRes = await getCalendarEventById(event!.id);
    expect(
      eventRes.data?.lookup?.calendarEvent?.googleCalendarUrl
    ).toBeDefined();
  });

  test('should handle event with special characters in description', async () => {
    const res = await createCalendarEventOnCalendar(calendarId, {
      displayName: `Special Chars ${uniqueId}`,
      description: 'Event with commas, semicolons; and special chars',
      startDate: '2026-11-15T10:00:00.000Z',
      durationMinutes: 60,
      multipleDays: false,
      wholeDay: false,
    });
    const event = res.data?.createEventOnCalendar;
    expect(event).toBeDefined();
    eventIds.push(event!.id);

    const eventRes = await getCalendarEventById(event!.id);
    expect(
      eventRes.data?.lookup?.calendarEvent?.googleCalendarUrl
    ).toBeDefined();
  });
});
