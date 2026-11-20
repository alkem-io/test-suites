#!/usr/bin/env bash
# 68-c6-volume-xcheck.sh  (2026-11-16, closing check of the C6 review)
# Guard, not a repair. Reads only, prints counts, sizes and dates only, never an id, a hash or a name.
# File 56 could only infer from the backup queue and the off-site ledger whether the bytes of a
# file row still exist. This script settles it with a listing of the file store itself.
# Input: a listing of the file-service volume, one line per file: "<size> <mtime epoch> <path>".
# Made on acceptance on 2026-11-16 with (read only, needs cluster access and the QA lead's go):
#   kubectl exec deploy/<file service deployment> -c <container> -- \
#     sh -c 'find /storage -type f -exec stat -c "%s %Y %n" {} +' | awk 'NF==3' > volume-stat.txt
# The file store keeps one file per content hash, named by the hash (file."externalID"), directly
# under /storage. Files in sub-folders are reported apart: the file service does not read them.
# The evidence classes 1 to 5 are the ones of file 56 and are built the same way.
# The listing must be close in time to the database backup. Files written to the volume after the
# backup show up in V5 as files with no file row; a file deleted after the backup would show up
# as missing, so V4 gives the newest change time on the volume for comparison.
#
# usage: 68-c6-volume-xcheck.sh <alkemio_db> <filebackup_db> <volume-stat.txt> [backup date, default 2026-11-11]
# env:   PSQL  psql command prefix, without -d (default: docker exec -i alkemio_dev_postgres psql -U synapse)
# example: ./68-c6-volume-xcheck.sh alkemio acc_filebackup runs/acc-volume-2026-11-16/volume-stat.txt > runs/acc-2026-11-11/68-alkemio.out
set -uo pipefail
adb=${1:?usage: 68-c6-volume-xcheck.sh <alkemio_db> <filebackup_db> <volume-stat.txt> [backup date]}
fdb=${2:?usage: 68-c6-volume-xcheck.sh <alkemio_db> <filebackup_db> <volume-stat.txt> [backup date]}
vol=${3:?usage: 68-c6-volume-xcheck.sh <alkemio_db> <filebackup_db> <volume-stat.txt> [backup date]}
bdate=${4:-2026-11-11}
[ -r "$vol" ] || { echo "cannot read $vol" >&2; exit 1; }
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
CREATE TEMP TABLE c6_vol(size bigint, mtime bigint, name text, place text);
COPY c6_vol FROM STDIN WITH (FORMAT csv, DELIMITER '|');
SQL
# size | mtime | file name | root or the first sub-folder
awk '{n=split($3,a,"/"); print $1 "|" $2 "|" a[n] "|" (n==3 ? "root" : a[3])}' "$vol"
cat <<SQL
\.
CREATE INDEX ON c6_vol (name); ANALYZE c6_vol;
\set bdate '$bdate'
SQL
cat <<'SQL'
\echo === V0 the listing: files on the volume by place and name length
SELECT place, length(name) AS name_length, count(*) AS files, pg_size_pretty(sum(size)) AS bytes, count(*) FILTER (WHERE size = 0) AS empty_files,
       to_timestamp(min(mtime))::date AS oldest_change, to_timestamp(max(mtime))::date AS newest_change
  FROM c6_vol GROUP BY 1,2 ORDER BY 1,2;
\echo === V1 per evidence class of file 56: stored files (blobs) found on the volume, found only in a sub-folder, missing
WITH b AS (SELECT h, min(cls) AS cls, max(size) AS size, count(*) AS file_rows, count(*) FILTER (WHERE NOT rejected) AS kept_rows FROM c6_fx GROUP BY h),
     j AS (SELECT b.*, EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h AND v.place = 'root') AS in_root,
                  EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h AND v.place <> 'root') AS in_sub FROM b)
SELECT cls AS evidence_class, count(*) AS blobs, sum(file_rows) AS file_rows,
       count(*) FILTER (WHERE in_root) AS blobs_on_volume,
       count(*) FILTER (WHERE NOT in_root AND in_sub) AS blobs_only_in_a_sub_folder,
       count(*) FILTER (WHERE NOT in_root AND NOT in_sub) AS blobs_missing,
       sum(file_rows) FILTER (WHERE NOT in_root AND NOT in_sub) AS file_rows_missing,
       sum(kept_rows) FILTER (WHERE NOT in_root AND NOT in_sub) AS kept_file_rows_missing,
       pg_size_pretty(sum(size) FILTER (WHERE NOT in_root AND NOT in_sub)) AS bytes_missing
  FROM j GROUP BY ROLLUP(1) ORDER BY 1;
\echo === V2 missing blobs by month of first upload (expected: explained by known loss periods)
WITH b AS (SELECT h, min(first_made) AS first_made, count(*) AS file_rows, count(*) FILTER (WHERE NOT rejected) AS kept_rows FROM c6_fx GROUP BY h)
SELECT to_char(first_made, 'YYYY-MM') AS first_uploaded, count(*) AS blobs_missing, sum(file_rows) AS file_rows, sum(kept_rows) AS kept_file_rows
  FROM b WHERE NOT EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h) GROUP BY 1 ORDER BY 1;
\echo === V3 blobs on the volume: does the size on the volume equal the size on the file row (expected: all equal)
WITH b AS (SELECT h, max(size) AS size, min(size) AS min_size FROM c6_fx GROUP BY h)
SELECT CASE WHEN v.size = b.size THEN 'equal' WHEN v.size = 0 THEN 'empty on the volume' WHEN b.size <> b.min_size AND v.size = b.min_size THEN 'equal to another row of the same blob'
            ELSE 'different' END AS size_check, count(*) AS blobs
  FROM b JOIN c6_vol v ON v.name = b.h AND v.place = 'root' GROUP BY 1 ORDER BY 1;
\echo === V4 time gap: newest change on the volume against the backup date
SELECT :'bdate'::date AS backup_date, to_timestamp(max(mtime))::date AS newest_change_on_volume,
       count(*) FILTER (WHERE to_timestamp(mtime) >= :'bdate'::date) AS files_changed_since_backup FROM c6_vol;
\echo === V5 files on the volume that no file row names (expected: only files written after the backup, or leftovers)
SELECT v.place, CASE WHEN to_timestamp(v.mtime) >= :'bdate'::date THEN 'changed since the backup' ELSE 'older than the backup' END AS age,
       EXISTS (SELECT 1 FROM c6_led l WHERE l.h = v.name) AS in_off_site_ledger,
       count(*) AS files, pg_size_pretty(sum(v.size)) AS bytes
  FROM c6_vol v WHERE NOT EXISTS (SELECT 1 FROM c6_fx f WHERE f.h = v.name) GROUP BY 1,2,3 ORDER BY 1,2,3;
\echo === V6 the inference of file 56 against the listing: class 1 and 2 said missing, class 3 to 5 said present or unknown
WITH b AS (SELECT h, min(cls) AS cls FROM c6_fx GROUP BY h)
SELECT CASE WHEN cls < '3' THEN 'file 56 said missing or very likely missing' ELSE 'file 56 said unknown or present' END AS inference,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h)) AS on_volume,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h)) AS not_on_volume
  FROM b GROUP BY 1 ORDER BY 1;
\echo === V7 blobs missing on the volume that the off-site ledger holds as stored (can be restored from the off-site copy)
WITH b AS (SELECT h, bool_or(in_ledger) AS in_ledger, count(*) AS file_rows, count(*) FILTER (WHERE NOT rejected) AS kept_rows, max(size) AS size FROM c6_fx GROUP BY h)
SELECT in_ledger AS off_site_copy_exists, count(*) AS blobs_missing, sum(file_rows) AS file_rows, sum(kept_rows) AS kept_file_rows, pg_size_pretty(sum(size)) AS bytes
  FROM b WHERE NOT EXISTS (SELECT 1 FROM c6_vol v WHERE v.name = b.h) GROUP BY 1 ORDER BY 1;
SQL
} | $PSQL -d "$adb" -X -q -v ON_ERROR_STOP=1
