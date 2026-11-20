#!/usr/bin/env bash
# 56-c6-file-bytes-xcheck.sh  (2026-11-13, written in the C6 review)
# Guard, not a repair. Reads only, prints counts and dates only, never an id, a hash or a name.
# A file row (table file) is the platform record of an uploaded file. Its bytes live in the file
# store of the file service under a key that is the content hash of the bytes (file."externalID").
# Rows with the same bytes share one stored object, called a blob here.
# Question it serves: for which file rows is there evidence that the bytes are gone, and how
# strong is it? Nothing in a database backup says directly whether the bytes are in the file
# store. Two indirect sources exist and this script joins them:
#   1. the backup queue in the platform database (file_backup_outbox). The backup worker asks the
#      file service for the bytes of each new file row. A queue row left as skipped means the file
#      service answered that it has no such blob (file-service, document_handler.go GetBlobContent,
#      origin/develop of 2026-11-11). Rows that were backed up are removed from the queue.
#   2. the ledger of the backup service in its own database (file_backup_object and
#      file_backup_target_status). A stored record means the bytes existed and were copied
#      off-site on that date. No record means only that no copy was made.
# So: skipped and no record = the store had no bytes when asked. No record alone = no off-site
# copy, the bytes may or may not be there. Only a listing of the file store settles it.
# The two databases cannot be joined, so the ledger is exported to a temp file and loaded into a
# temp table on the platform side. The temp file is removed at the end.
# The kept and rejected split comes from the classifier of file 30 (temp table orphan), which is
# run first with its output and its own headings thrown away. This takes a few minutes.
# Both databases must be backups of the same moment, or new uploads show up as not backed up.
#
# usage: 56-c6-file-bytes-xcheck.sh <alkemio_db> <filebackup_db>
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./56-c6-file-bytes-xcheck.sh alkemio acc_filebackup > runs/acc-2026-11-11/56-alkemio.out
set -uo pipefail
adb=${1:?usage: 56-c6-file-bytes-xcheck.sh <alkemio_db> <filebackup_db>}
fdb=${2:?usage: 56-c6-file-bytes-xcheck.sh <alkemio_db> <filebackup_db>}
PSQL=${PSQL:-docker exec -i alkemio_dev_postgres psql -U synapse}
here=$(cd "$(dirname "$0")" && pwd)
classifier="$here/30-architect-classifier-reconstruction.sql"
[ -r "$classifier" ] || { echo "cannot read $classifier" >&2; exit 1; }
tmpl=$(mktemp); trap 'rm -f "$tmpl"' EXIT
# content hash | size in the ledger | first seen by the backup service | 1 when some target holds it as stored
$PSQL -d "$fdb" -X -q -At -F '|' -c "
SELECT o.\"externalID\", o.size, o.\"firstSeenAt\"::date,
       CASE WHEN EXISTS (SELECT 1 FROM file_backup_target_status s WHERE s.\"externalID\" = o.\"externalID\" AND s.state::text = 'stored') THEN 1 ELSE 0 END
  FROM file_backup_object o ORDER BY 1" > "$tmpl" || exit 1
{
echo '\o /dev/null'
awk '/^\\echo === 3 per-table classification/{exit} !/^\\echo/{print}' "$classifier"
echo '\o'
cat <<'SQL'
\pset footer off
CREATE TEMP TABLE c6_led(h text, size bigint, first_seen date, stored int);
COPY c6_led FROM STDIN WITH (FORMAT csv, DELIMITER '|');
SQL
cat "$tmpl"
cat <<'SQL'
\.
CREATE INDEX ON c6_led (h); ANALYZE c6_led;
CREATE TEMP TABLE c6_fx AS
SELECT f.id, f."externalID" AS h, f.size, f."mimeType" AS mime, f."createdDate" AS made, f."temporaryLocation" AS tmp,
       EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='file' AND o.id=f.id::text) AS rejected,
       EXISTS (SELECT 1 FROM c6_led l WHERE l.h = f."externalID" AND l.stored = 1) AS in_ledger,
       COALESCE((SELECT string_agg(DISTINCT x.status::text, ',' ORDER BY x.status::text) FROM file_backup_outbox x WHERE x."externalID" = f."externalID"), '') AS queue,
       NULL::timestamp AS first_made, NULL::text AS cls
  FROM file f;
UPDATE c6_fx SET first_made = b.first_made,
       cls = CASE WHEN c6_fx.queue ~ 'skipped' AND NOT c6_fx.in_ledger THEN '1 backup worker found no bytes, no off-site record'
                  WHEN NOT c6_fx.in_ledger AND b.first_made >= '2026-01-01' THEN '2 no off-site record, first uploaded in 2026'
                  WHEN NOT c6_fx.in_ledger AND b.first_made <  '2024-01-01' THEN '3 no off-site record, first uploaded in 2023'
                  WHEN NOT c6_fx.in_ledger THEN '4 no off-site record, first uploaded in 2024 or 2025'
                  ELSE '5 has an off-site record' END
  FROM (SELECT h, min(made) AS first_made FROM c6_fx GROUP BY h) b WHERE b.h = c6_fx.h;
CREATE INDEX ON c6_fx (id); ANALYZE c6_fx;
CREATE TEMP TABLE c6_use AS
SELECT CASE WHEN v."mediaGalleryId" IS NOT NULL THEN 'visual in a media gallery' ELSE 'visual on a profile' END AS place, substring(v.uri from '/document/([0-9a-f-]{36})') AS fid,
       NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='visual' AND o.id=v.id::text) AS holder_kept
  FROM visual v WHERE v.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'reference', substring(r.uri from '/document/([0-9a-f-]{36})'), NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='reference' AND o.id=r.id::text)
  FROM reference r WHERE r.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'link', substring(l.uri from '/document/([0-9a-f-]{36})'), NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='link' AND o.id=l.id::text)
  FROM link l WHERE l.uri ~ '/api/private/rest/storage/document/'
UNION ALL SELECT 'profile description', d.fid, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='profile' AND o.id=d.id::text)
  FROM (SELECT DISTINCT p.id, m.m[1] AS fid FROM profile p, regexp_matches(p.description, '/document/([0-9a-f-]{36})', 'g') AS m(m)) d
UNION ALL SELECT 'office document body', c."documentId"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='collabora_document' AND o.id=c.id::text)
  FROM collabora_document c WHERE c."documentId" IS NOT NULL
UNION ALL SELECT 'whiteboard body', w."contentPointer"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='whiteboard' AND o.id=w.id::text)
  FROM whiteboard w WHERE w."contentPointer" IS NOT NULL
UNION ALL SELECT 'memo body', w."contentPointer"::text, NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='memo' AND o.id=w.id::text)
  FROM memo w WHERE w."contentPointer" IS NOT NULL;
CREATE INDEX ON c6_use (fid); ANALYZE c6_use;
\echo === 56 file bytes: the backup queue and the off-site ledger against the file rows
\echo --- X0 the two sources. The ledger: objects, how many are held as stored, the dates the backup service first saw them. The queue: rows by status
\echo     Acceptance 2026-11-11: 9,430 ledger objects, first seen 2026-07-17 to 2026-11-10; queue 381 skipped and 5 dead_letter.
SELECT count(*) AS ledger_objects, count(*) FILTER (WHERE stored = 1) AS held_as_stored, min(first_seen) AS first_seen_from, max(first_seen) AS first_seen_to,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM c6_fx f WHERE f.h = l.h)) AS objects_no_file_row_names
  FROM c6_led l;
SELECT x.status::text AS queue_status, count(*) AS queue_rows, count(DISTINCT x."externalID") AS blobs, min(x."createdDate")::date AS first_made, max(x."createdDate")::date AS last_made
  FROM file_backup_outbox x GROUP BY 1 ORDER BY 1;
\echo --- X1 file rows by strength of evidence. Class 1 is evidence that the bytes are gone. Classes 2 to 4 only say that no off-site copy exists
\echo     Acceptance 2026-11-11: class 1 826 rows on 117 blobs; class 2 668 on 607; class 3 1,384 on 940; class 4 29 on 26; class 5 17,236 on 7,267.
\echo     Classes 1 and 2 together 1,494 rows on 724 blobs; the architect lists 1,500 rows on 729 blobs as missing from the file store.
SELECT cls AS evidence_class, count(*) AS file_rows, count(DISTINCT h) AS blobs, count(*) FILTER (WHERE rejected) AS rejected_rows, count(*) FILTER (WHERE NOT rejected) AS kept_rows,
       count(DISTINCT h) FILTER (WHERE NOT rejected) AS blobs_with_a_kept_row, count(*) FILTER (WHERE tmp) AS temporary_rows, round(sum(size)/1e6) AS mb_by_row, count(*) FILTER (WHERE size = 0) AS empty_files
  FROM c6_fx GROUP BY 1 ORDER BY 1;
SELECT count(*) AS rows_classes_1_and_2, count(DISTINCT h) AS blobs_classes_1_and_2, count(*) FILTER (WHERE NOT rejected) AS kept_rows, count(*) FILTER (WHERE rejected) AS rejected_rows
  FROM c6_fx WHERE cls < '3';
SELECT b.cls AS evidence_class, count(*) AS blobs, round(sum(b.size)/1e6) AS mb_counting_each_blob_once
  FROM (SELECT h, min(cls) AS cls, max(size) AS size FROM c6_fx GROUP BY h) b WHERE b.cls < '5' GROUP BY 1 ORDER BY 1;
\echo --- X2 soundness: a blob with an off-site record that the backup worker also found missing (the empty file, whose key is the hash of nothing, is expected here), and file rows whose size differs from the ledger size (expect 0)
\echo     Acceptance 2026-11-11: 25 rows on 1 blob, all empty files; size differs 0.
SELECT count(*) FILTER (WHERE f.queue ~ 'skipped' AND f.in_ledger) AS rows_skipped_yet_recorded, count(DISTINCT f.h) FILTER (WHERE f.queue ~ 'skipped' AND f.in_ledger) AS blobs,
       count(*) FILTER (WHERE f.queue ~ 'skipped' AND f.in_ledger AND f.size > 0) AS of_these_with_content,
       count(*) FILTER (WHERE l.h IS NOT NULL AND l.size <> f.size) AS rows_size_differs_from_ledger
  FROM c6_fx f LEFT JOIN c6_led l ON l.h = f.h;
\echo --- X3 classes 1 to 4 by the month the blob was first uploaded. The backup service started on the first seen date of X0 and went back over older files
\echo     Acceptance 2026-11-11: 720 of the 724 blobs of classes 1 and 2 were first uploaded 2026-04 to 2026-06, the last 2 in 2026-07; class 3 is all of 2023.
SELECT to_char(first_made, 'YYYY-MM') AS blob_first_uploaded, cls AS evidence_class, count(DISTINCT h) AS blobs, count(*) AS file_rows, count(*) FILTER (WHERE rejected) AS rejected_rows
  FROM c6_fx WHERE cls < '5' GROUP BY 1,2 ORDER BY 1,2;
\echo --- X3b is it still happening: all blobs by the month they were first uploaded, from 2026 on, and how many of them are in classes 1 and 2
\echo     Acceptance 2026-11-11: 2026-04 38 of 193, 2026-05 102 of 177, 2026-06 580 of 658, 2026-07 2 of 1,130, and none of the 3,558 blobs first uploaded from 2026-08 on.
SELECT to_char(b.first_made, 'YYYY-MM') AS blob_first_uploaded, count(*) AS blobs, count(*) FILTER (WHERE b.cls < '3') AS in_classes_1_and_2, max(b.first_made) FILTER (WHERE b.cls < '3')::date AS last_such_upload
  FROM (SELECT h, min(first_made) AS first_made, min(cls) AS cls FROM c6_fx GROUP BY h) b WHERE b.first_made >= '2026-01-01' GROUP BY 1 ORDER BY 1;
\echo --- X4 the busiest upload days of classes 1 and 2 (days with 10 blobs or more)
\echo     Acceptance 2026-11-11: 2026-06-12 alone has 332 blobs, none of them in class 1.
SELECT first_made::date AS blob_first_uploaded, count(DISTINCT h) AS blobs, count(*) AS file_rows, count(DISTINCT h) FILTER (WHERE cls LIKE '1%') AS blobs_in_class_1
  FROM c6_fx WHERE cls < '3' GROUP BY 1 HAVING count(DISTINCT h) >= 10 ORDER BY 2 DESC;
\echo --- X5 every place that points at a file row, for the file rows of classes 1 to 4 and for file rows that do not exist. A place is a stored link or the body pointer of a document
\echo     Acceptance 2026-11-11: file row does not exist 25 pointers, 24 on a kept holder; office document body 43, all in class 2.
SELECT COALESCE(f.cls, '0 file row does not exist') AS evidence_class, u.place, count(*) AS pointers, count(*) FILTER (WHERE u.holder_kept) AS on_kept_holder, count(DISTINCT u.fid) AS file_rows
  FROM c6_use u LEFT JOIN c6_fx f ON f.id::text = u.fid WHERE f.cls IS NULL OR f.cls < '5' GROUP BY 1,2 ORDER BY 1,2;
\echo --- X6 office documents (the files edited in the office editor) by the evidence class of their file row
\echo     Acceptance 2026-11-11: 119 documents; 43 in class 2 on 42 blobs, 40 of them kept documents; 0 in class 1; 1 with no file row.
SELECT COALESCE(f.cls, '0 no file row') AS evidence_class, count(*) AS office_documents, count(DISTINCT f.h) AS blobs,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='collabora_document' AND o.id=c.id::text)) AS kept_documents,
       count(*) FILTER (WHERE f.size = 0) AS empty_files, min(c."createdDate")::date AS first_made, max(c."createdDate")::date AS last_made
  FROM collabora_document c LEFT JOIN c6_fx f ON f.id = c."documentId" GROUP BY 1 ORDER BY 1;
\echo --- X7 file rows that none of the places of X5 points at, by evidence class. Not a defect by itself: files of chat messages and uploads never linked are not in X5
SELECT cls AS evidence_class, count(*) AS file_rows, count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM c6_use u WHERE u.fid = f.id::text)) AS no_pointer_found,
       count(*) FILTER (WHERE NOT rejected AND NOT EXISTS (SELECT 1 FROM c6_use u WHERE u.fid = f.id::text)) AS kept_and_no_pointer_found
  FROM c6_fx f GROUP BY 1 ORDER BY 1;
\echo --- X8 kind of file per evidence class, classes 1 to 4
\echo     Acceptance 2026-11-11: class 4 holds one PDF blob of 16 MB on 3 kept rows, the PDF of finding B5.
SELECT cls AS evidence_class, CASE WHEN mime LIKE 'image/%' THEN 'picture' WHEN mime = 'application/pdf' THEN 'PDF' WHEN mime ~ 'officedocument|msword|ms-excel|ms-powerpoint|opendocument' THEN 'office file' ELSE 'other' END AS kind,
       count(*) AS file_rows, count(DISTINCT h) AS blobs, count(*) FILTER (WHERE rejected) AS rejected_rows, round(sum(size)/1e6) AS mb_by_row
  FROM c6_fx WHERE cls < '5' GROUP BY 1,2 ORDER BY 1,2;
\echo --- X9 file rows whose key is not a content hash of 64 lowercase hex characters, with their evidence class
\echo     Acceptance 2026-11-11: 1 row, key of 46 characters, made 2023, class 3.
SELECT length(h) AS key_length, cls AS evidence_class, count(*) AS file_rows, count(*) FILTER (WHERE rejected) AS rejected_rows FROM c6_fx WHERE h !~ '^[0-9a-f]{64}$' GROUP BY 1,2 ORDER BY 1,2;
\echo --- X10 off-site records by the year a blob was first uploaded (files with content). A year with almost no record is a hole in what the backup service covered, not a sign of lost bytes
\echo     Acceptance 2026-11-11: 2023 98 of 1,038 blobs have a record, 2024 924 of 947, 2025 877 of 880, 2026 5,367 of 6,091.
SELECT to_char(b.first_made, 'YYYY') AS blob_first_uploaded, count(*) AS blobs, count(*) FILTER (WHERE b.in_ledger) AS with_off_site_record, count(*) FILTER (WHERE NOT b.in_ledger) AS no_record
  FROM (SELECT h, min(first_made) AS first_made, bool_or(in_ledger) AS in_ledger FROM c6_fx WHERE size > 0 GROUP BY h) b GROUP BY 1 ORDER BY 1;
\echo --- X11 pictures of classes 1 and 2: does the row carry measured dimensions. The file service writes them from the bytes at upload, so a row with dimensions is a file whose bytes did arrive
\echo     Acceptance 2026-11-11: class 1 807 of 809 picture rows have dimensions, class 2 565 of 609.
SELECT x.cls AS evidence_class, count(*) AS picture_rows, count(*) FILTER (WHERE f.content_metadata ? 'imageWidth') AS with_dimensions, count(*) FILTER (WHERE f.content_metadata = '{}'::jsonb) AS without
  FROM c6_fx x JOIN file f ON f.id = x.id WHERE x.cls < '3' AND x.mime LIKE 'image/%' GROUP BY 1 ORDER BY 1;
\echo === 56 done
SQL
} | $PSQL -d "$adb" -X -q 2>&1
