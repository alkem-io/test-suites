---
feature: Calendar events
slug: calendar
---

<!-- Covers server-api/src/functional-api/calendar/calendar-event.it-spec.ts -->

## TC-0300 — A community lead can create a calendar event

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. As a community lead, call `createCalendarEvent` with title, startDate, endDate, and description.
2. Query the space's calendar.

### Expected

- The event is returned with the submitted values and a server-assigned ID.
- It appears in the calendar's event list.

## TC-0301 — Users can query, update, and delete calendar events they own or admin

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Query a calendar by space ID and filter by date range.
2. Update an event's title as its author.
3. Delete an event as an admin; as a non-owner non-admin, expect an auth error.

### Expected

- Query filters work as specified; update and delete succeed per the authorization model.

## TC-0302 — Calendar events support "Add to calendar" links (.ics and provider URLs)

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. On an existing event, request the Google / Outlook / generic `.ics` download URLs.
2. Follow the `.ics` URL unauthenticated and parse the response.

### Expected

- Each link resolves and returns valid iCalendar content with the expected summary, start/end, and description.

## TC-0303 — Event visibility and edits are authorized correctly across roles

```yaml
priority: P1
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Create a private-space event and confirm that non-members cannot see it.
2. As a community manager, confirm the event is visible and editable.
3. As an unrelated user, confirm no access.

### Expected

- Visibility respects the enclosing space's privacy policy.
- Edits are authorized only for owners, community managers, and admins.

## TC-0304 — Different event types (Meeting, Workshop, Other) round-trip correctly

```yaml
priority: P2
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Create one event of each supported type.
2. Query each back and assert the returned type matches.

### Expected

- All supported event types are accepted and returned without coercion.

## TC-0305 — Edge cases: overlapping times, past dates, multi-day events

```yaml
priority: P3
type: integration
state: Ready
automation: required
owner: ev.dimitrovv
```

### Steps

1. Attempt to create an event with `endDate` before `startDate`.
2. Create an event entirely in the past.
3. Create an event spanning multiple days.

### Expected

- End-before-start returns a validation error.
- Past events are accepted (valid historical record).
- Multi-day events are returned correctly on both boundaries.
