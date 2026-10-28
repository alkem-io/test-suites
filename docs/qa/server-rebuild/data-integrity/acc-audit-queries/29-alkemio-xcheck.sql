\echo === FB1 file_backup_outbox status
SELECT status, count(*), max(attempts), min("createdDate")::date, max("createdDate")::date, count(*) FILTER (WHERE "lastError" IS NOT NULL) with_error FROM file_backup_outbox GROUP BY 1;
SELECT left("lastError",150), count(*) FROM file_backup_outbox WHERE "lastError" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 5;
\echo === FB2 outbox rows for files that no longer exist
SELECT count(*) FROM file_backup_outbox o WHERE NOT EXISTS (SELECT 1 FROM file f WHERE f.id=o."fileId");
\echo === FB3 files never backed up (CSV from filebackup not available here) → files with no outbox row at all, by year & bucket presence
SELECT date_trunc('year', f."createdDate")::date yr, (f."storageBucketId" IS NULL) no_bucket, f."temporaryLocation", count(*) FROM file f WHERE NOT EXISTS (SELECT 1 FROM file_backup_outbox o WHERE o."externalID"=f."externalID") GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === FB4 files with outbox row not in final status
SELECT o.status, count(*) FROM file_backup_outbox o JOIN file f ON f.id=o."fileId" GROUP BY 1;
\echo === FB5 externalID shared by multiple files (dedupe by content hash?)
SELECT n, count(*) FROM (SELECT "externalID", count(*) n FROM file GROUP BY 1) x GROUP BY 1 ORDER BY 1 LIMIT 10;
\echo === FB6 file mimeType vs externalReference
SELECT ("externalReference" IS NOT NULL) has_ref, count(*) FROM file GROUP BY 1;
\echo === SY1 alkemio rooms vs synapse aliases (reverse join)
CREATE TEMP TABLE syr(alias_uuid uuid);
\copy syr FROM 'syn-room-alias-uuids.csv' CSV
CREATE TEMP TABLE syu(uid uuid);
\copy syu FROM 'syn-user-uuids.csv' CSV
SELECT (SELECT count(*) FROM syr) syn_rooms, (SELECT count(*) FROM syu) syn_users;
SELECT r.type, (r."messagesCount">0) has_msgs, count(*) FROM room r WHERE NOT EXISTS (SELECT 1 FROM syr WHERE syr.alias_uuid=r.id) GROUP BY 1,2 ORDER BY 3 DESC;
\echo === SY2 alkemio rooms with no synapse room: who owns them (callout / discussion / conversation / updates) and year
SELECT date_trunc('year', r."createdDate")::date yr, r.type, count(*) FROM room r WHERE NOT EXISTS (SELECT 1 FROM syr WHERE syr.alias_uuid=r.id) GROUP BY 1,2 ORDER BY 1,2;
\echo === SY3 synapse user uuids that are alkemio actors (which actor types)
SELECT a.type, count(*) FROM syu JOIN actor a ON a.id=syu.uid GROUP BY 1;
SELECT count(*) FROM syu WHERE NOT EXISTS (SELECT 1 FROM actor a WHERE a.id=syu.uid);
\echo === SY4 alkemio actors of user/vc type without synapse user
SELECT a.type, count(*) FROM actor a WHERE a.type IN ('user','virtual-contributor','virtual') AND NOT EXISTS (SELECT 1 FROM syu WHERE syu.uid=a.id) GROUP BY 1;
SELECT DISTINCT type FROM actor;
