CREATE TEMP TABLE fbo(ext text, size bigint, first_seen timestamptz);
\copy fbo FROM 'fb-objects.csv' CSV
SELECT count(*) FROM fbo;
\echo === FB7 alkemio files not in offsite backup: externalID shape, bucket, temp, year
SELECT date_trunc('year', f."createdDate")::date yr, (length(f."externalID")=64 AND f."externalID" ~ '^[0-9a-f]{64}$') sha256_id, length(f."externalID") len, (f."storageBucketId" IS NULL) no_bucket, f."temporaryLocation" tmp, count(*) files, count(DISTINCT f."externalID") blobs, pg_size_pretty(sum(f.size)::bigint) bytes
FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;
\echo === FB8 not-backed-up 2026 files by month (is backup lagging or skipping?)
SELECT date_trunc('month', f."createdDate")::date m, count(DISTINCT f."externalID") blobs, count(*) files FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 1;
\echo === FB9 not-backed-up 2026 files: mime types / has outbox row / bucket type
SELECT f."mimeType", count(*) FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 2 DESC LIMIT 8;
SELECT (o.id IS NOT NULL) has_outbox, o.status, count(*) FROM file f LEFT JOIN file_backup_outbox o ON o."externalID"=f."externalID" WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate">='2026-01-01' GROUP BY 1,2;
\echo === FB10 backed-up blobs whose first alkemio file is older than backup start (backfill worked?) vs 2023 gap
SELECT date_trunc('year', f."createdDate")::date yr, count(DISTINCT f."externalID") blobs_total, count(DISTINCT f."externalID") FILTER (WHERE EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID")) backed_up FROM file f GROUP BY 1 ORDER BY 1;
\echo === FB11 skipped outbox rows: sample
SELECT o.status, o.attempts, o.deliveries, o.priority, left(o."lastError",80), count(*) FROM file_backup_outbox o GROUP BY 1,2,3,4,5 ORDER BY 6 DESC LIMIT 8;
\echo === R1 the 7 alkemio rooms without a synapse room
CREATE TEMP TABLE syr(alias_uuid uuid);
\copy syr FROM 'syn-room-alias-uuids.csv' CSV
SELECT r.id, r.type, r."messagesCount", r."createdDate"::date, c.id conversation_id, c."messagingId" FROM room r LEFT JOIN conversation c ON c."roomId"=r.id WHERE NOT EXISTS (SELECT 1 FROM syr WHERE syr.alias_uuid=r.id) ORDER BY r."createdDate";
\echo === R2 conversation rooms overall: count by type, with/without synapse room
SELECT r.type, EXISTS (SELECT 1 FROM syr WHERE syr.alias_uuid=r.id) in_synapse, count(*) FROM room r WHERE r.type LIKE 'conversation%' GROUP BY 1,2;
\echo === R3 rooms whose owner entity is gone (room orphans) — callout/post/discussion/updates/conversation
SELECT r.type, count(*) FROM room r WHERE NOT EXISTS (SELECT 1 FROM callout c WHERE c."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM post p WHERE p."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM discussion d WHERE d."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM communication m WHERE m."updatesId"=r.id) AND NOT EXISTS (SELECT 1 FROM conversation v WHERE v."roomId"=r.id) AND NOT EXISTS (SELECT 1 FROM callout_contribution cc WHERE cc."postId" IN (SELECT id FROM post WHERE "commentsId"=r.id)) GROUP BY 1 ORDER BY 2 DESC;
