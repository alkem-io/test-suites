CREATE TEMP TABLE fbo(ext text, size bigint, first_seen timestamptz);
\copy fbo FROM 'fb-objects.csv' CSV
\echo === FB12 size: backed-up max vs not-backed-up min (threshold?)
SELECT pg_size_pretty(max(size)) max_backed_up, pg_size_pretty(percentile_cont(0.99) WITHIN GROUP (ORDER BY size)::bigint) p99 FROM fbo;
SELECT pg_size_pretty(min(f.size)::bigint) min_not_backed, pg_size_pretty(max(f.size)::bigint) max_not_backed, count(*) FILTER (WHERE f.size > (SELECT max(size) FROM fbo)) above_max FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate">='2026-01-01';
SELECT width_bucket(f.size, 0, 10485760, 10) bucket_mb, count(*) FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate">='2026-01-01' GROUP BY 1 ORDER BY 1;
SELECT o.status, pg_size_pretty(min(o.size)::bigint), pg_size_pretty(max(o.size)::bigint), count(*) FROM file_backup_outbox o GROUP BY 1;
\echo === FB13 2023 blobs not backed up: do their files still have a bucket / are they referenced?
SELECT (f."storageBucketId" IS NULL) no_bucket, count(DISTINCT f."externalID") blobs, pg_size_pretty(max(f.size)::bigint) FROM file f WHERE NOT EXISTS (SELECT 1 FROM fbo WHERE fbo.ext=f."externalID") AND f."createdDate"<'2024-01-01' GROUP BY 1;
\echo === R3b room orphans (corrected: calendar_event included)
SELECT r.type, count(*), min(r."createdDate")::date, max(r."createdDate")::date FROM room r WHERE NOT EXISTS (SELECT 1 FROM callout c WHERE c."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM post p WHERE p."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM discussion d WHERE d."commentsId"=r.id) AND NOT EXISTS (SELECT 1 FROM communication m WHERE m."updatesId"=r.id) AND NOT EXISTS (SELECT 1 FROM conversation v WHERE v."roomId"=r.id) AND NOT EXISTS (SELECT 1 FROM calendar_event e WHERE e."commentsId"=r.id) GROUP BY 1 ORDER BY 2 DESC;
