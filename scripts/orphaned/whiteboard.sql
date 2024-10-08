SELECT * FROM alkemio.whiteboard;
SELECT * FROM alkemio.whiteboard where nameID = '' or nameID is null;
SELECT * FROM alkemio.whiteboard where content = '' or content is null;
SELECT * FROM alkemio.whiteboard where createdBy = '' or createdBy is null;
SELECT * FROM alkemio.whiteboard where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.whiteboard where profileId = '' or profileId is null;
SELECT * FROM alkemio.whiteboard where contentUpdatePolicy = '' or contentUpdatePolicy is null;