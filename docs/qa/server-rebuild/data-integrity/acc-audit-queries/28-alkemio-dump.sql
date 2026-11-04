\copy (SELECT u.id, u.email, u."authenticationID", u."serviceProfile", a."createdDate" FROM "user" u JOIN actor a ON a.id=u.id) TO 'alk-users.csv' CSV
\copy (SELECT id, type, "messagesCount", "createdDate" FROM room) TO 'alk-rooms.csv' CSV
\copy (SELECT id, "externalID", size, "mimeType", "createdDate", "createdBy", "temporaryLocation", "storageBucketId" FROM file) TO 'alk-documents.csv' CSV
\copy (SELECT id, "nameID" FROM actor) TO 'alk-actors.csv' CSV
SELECT 'users' k, count(*) FROM "user" UNION ALL SELECT 'rooms', count(*) FROM room UNION ALL SELECT 'documents', count(*) FROM file UNION ALL SELECT 'actors', count(*) FROM actor;
