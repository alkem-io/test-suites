SELECT * FROM alkemio.calendar_event;
SELECT * FROM alkemio.calendar_event where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.calendar_event where commentsId = '' or commentsId is null;
SELECT * FROM alkemio.calendar_event where  startDate is null;
SELECT * FROM alkemio.calendar_event where type = '' or type is null;
SELECT * FROM alkemio.calendar_event where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.calendar_event where nameID = '' or nameID is null;
SELECT * FROM alkemio.calendar_event where calendarId = '' or calendarId is null;
SELECT * FROM alkemio.calendar_event where profileId = '' or profileId is null;