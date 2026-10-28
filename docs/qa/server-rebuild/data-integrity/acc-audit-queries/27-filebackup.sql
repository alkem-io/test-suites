\echo === F-migrations
SELECT * FROM schema_migrations;
\echo === F-objects
SELECT count(*) total, sum(size) bytes, min("firstSeenAt")::date, max("firstSeenAt")::date, count(*) FILTER (WHERE "createdBy" IS NULL) no_creator, count(*) FILTER (WHERE "sourceCreatedDate" IS NULL) no_source_date FROM file_backup_object;
\echo === F-target status
SELECT target, state, count(*), count(*) FILTER (WHERE "verifiedAt" IS NULL) unverified, count(*) FILTER (WHERE "storedBytes" IS NULL) no_bytes FROM file_backup_target_status GROUP BY 1,2 ORDER BY 1,2;
\echo === F1 objects with no status row / status rows per object != targets
SELECT count(*) FROM file_backup_object o WHERE NOT EXISTS (SELECT 1 FROM file_backup_target_status s WHERE s."externalID"=o."externalID");
SELECT n, count(*) FROM (SELECT "externalID", count(*) n FROM file_backup_target_status GROUP BY 1) x GROUP BY 1;
\echo === F2 storedBytes != size
SELECT s.target, count(*) FROM file_backup_target_status s JOIN file_backup_object o ON o."externalID"=s."externalID" WHERE s."storedBytes" IS NOT NULL AND s."storedBytes"<>o.size GROUP BY 1;
\echo === F3 non-final states older than 1 day
SELECT state, count(*) FROM file_backup_target_status s JOIN file_backup_object o ON o."externalID"=s."externalID" WHERE s."verifiedAt" IS NULL AND o."firstSeenAt" < now()-interval '1 day' GROUP BY 1;
\echo === F4 cross-check with alkemio file table (CSV join)
CREATE TEMP TABLE alkf(id uuid, external_id text, size bigint, mime text, created timestamptz, created_by uuid, temp_loc bool, bucket uuid);
\copy alkf FROM 'alk-documents.csv' CSV
SELECT count(*) alk_files, count(DISTINCT external_id) alk_distinct_ext FROM alkf;
SELECT 'backup objects not in alkemio' k, count(*) FROM file_backup_object o WHERE NOT EXISTS (SELECT 1 FROM alkf WHERE alkf.external_id=o."externalID")
UNION ALL SELECT 'alkemio files (distinct ext) not backed up', count(DISTINCT external_id) FROM alkf f WHERE NOT EXISTS (SELECT 1 FROM file_backup_object o WHERE o."externalID"=f.external_id)
UNION ALL SELECT 'alkemio files not backed up, created before last seen', count(DISTINCT external_id) FROM alkf f WHERE NOT EXISTS (SELECT 1 FROM file_backup_object o WHERE o."externalID"=f.external_id) AND f.created < (SELECT max("firstSeenAt") FROM file_backup_object)
UNION ALL SELECT 'size mismatch alkemio vs backup', count(*) FROM file_backup_object o JOIN alkf f ON f.external_id=o."externalID" WHERE f.size<>o.size;
\echo === F5 not-backed-up alkemio files by year / temp location
SELECT date_trunc('year', f.created)::date yr, f.temp_loc, count(DISTINCT external_id) FROM alkf f WHERE NOT EXISTS (SELECT 1 FROM file_backup_object o WHERE o."externalID"=f.external_id) GROUP BY 1,2 ORDER BY 1,2;
\echo === F6 backup createdBy not an alkemio user
CREATE TEMP TABLE alku(id uuid, email text, auth_id uuid, service bool, created timestamptz);
\copy alku FROM 'alk-users.csv' CSV
SELECT count(*) FROM file_backup_object o WHERE o."createdBy" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM alku WHERE alku.id=o."createdBy");
\echo === F7 firstSeen per month (is the consumer still running?)
SELECT date_trunc('month', "firstSeenAt")::date m, count(*) FROM file_backup_object GROUP BY 1 ORDER BY 1;
