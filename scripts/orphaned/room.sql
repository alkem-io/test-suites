SELECT * FROM alkemio.room;
SELECT * FROM alkemio.room where externalRoomID = '' or externalRoomID is null;
SELECT * FROM alkemio.room where authorizationId = '' or authorizationId is null;
SELECT * FROM alkemio.room where type = '' or type is null;