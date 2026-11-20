#!/usr/bin/env python3
"""42-blob-ledger-check.py: do the blobs behind the file rows have a record in
the off-site file backup?

Why: the alkemio database holds file ROWS. The bytes live in file storage and
are copied to an off-site bucket by the file-backup service, which keeps a
ledger (database "filebackup": file_backup_object, file_backup_target_status).
This script joins the two by content hash (file."externalID") and counts, per
class of file row, how many blobs have a "stored" record and how many have none.

Limits, stated in the output:
  - a ledger record says the service stored and verified the object on a past
    date. It does not prove the object is in the bucket today, and it says
    nothing about the primary file store. Only reading the bucket proves that
    (43-file-store-body-scan.py checks the hash of every blob it is given).
  - it prints counts only.

Needs /tmp/closure-ids.txt (id|kinds) on the machine psql runs on, written by
38-reject-closure-scan.sql. Run after run-guards.sh, same PSQL.

usage: 42-blob-ledger-check.py [alkemio_db] [filebackup_db] [pairs_file]
       pairs_file  optional: the "kind|live body id|rejected id" file written
                   by 41-inline-body-scan.py, to report the named files as
                   their own class.
env:   PSQL  psql command prefix without -d
             default: docker exec -i alkemio_dev_postgres psql -U synapse
"""
import os, shlex, subprocess, sys

db = sys.argv[1] if len(sys.argv) > 1 else "alkemio"
fdb = sys.argv[2] if len(sys.argv) > 2 else "acc_filebackup"
pairs_file = sys.argv[3] if len(sys.argv) > 3 else None
psql = shlex.split(os.environ.get("PSQL", "docker exec -i alkemio_dev_postgres psql -U synapse"))

def run(database, sql):
    p = subprocess.run(psql + ["-d", database, "-X", "-q", "-At"], input=sql.encode(), capture_output=True)
    if p.returncode != 0 or b"ERROR" in p.stderr:
        sys.exit("psql failed on %s: %s" % (database, p.stderr.decode()[-600:]))
    return p.stdout.decode("utf-8", "replace")

named = []
if pairs_file and os.path.exists(pairs_file):
    named = sorted({l.strip().split("|")[2] for l in open(pairs_file) if l.count("|") == 2})

LIVE_W = """NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = w.id::text)"""
INLINE_W = """(length(coalesce(w.content,'')) > 2 AND coalesce(w."contentVersion",0) = 0)"""
INLINE_M = """(length(coalesce(w.content,''::bytea)) > 2 AND coalesce(w."contentVersion",0) = 0)"""
SQL1 = r"""
\set ON_ERROR_STOP on
CREATE TEMP TABLE rid (id text, kinds text);
\copy rid from '/tmp/closure-ids.txt' with (format csv, delimiter '|')
CREATE TEMP TABLE rf AS SELECT id FROM rid WHERE kinds ~ '(^|,)file($|,)';
CREATE TEMP TABLE named (id text);
COPY named FROM STDIN;
%s
\.
\copy (SELECT f."externalID", f.size, (EXISTS (SELECT 1 FROM rf WHERE rf.id=f.id::text))::int, (EXISTS (SELECT 1 FROM named n WHERE n.id=f.id::text))::int, (EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text AND %s AND NOT %s))::int, (EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text AND %s))::int, (EXISTS (SELECT 1 FROM memo w WHERE w."contentPointer"=f.id::text AND %s AND NOT %s))::int, (EXISTS (SELECT 1 FROM memo w WHERE w."contentPointer"=f.id::text AND %s))::int, (EXISTS (SELECT 1 FROM collabora_document w WHERE w."documentId"=f.id AND %s))::int, to_char(f."createdDate",'YYYY-MM'), (EXISTS (SELECT 1 FROM storage_bucket b WHERE b.id=f."storageBucketId" AND ((b."maxFileSize" > 0 AND f.size > b."maxFileSize") OR (coalesce(b."allowedMimeTypes",'')<>'' AND NOT (f."mimeType" = ANY (string_to_array(b."allowedMimeTypes", ','))) AND NOT EXISTS (SELECT 1 FROM whiteboard w WHERE w."contentPointer"=f.id::text) AND NOT EXISTS (SELECT 1 FROM memo w WHERE w."contentPointer"=f.id::text)))))::int, (EXISTS (SELECT 1 FROM storage_bucket b WHERE b.id=f."storageBucketId" AND (NOT (b."maxFileSize" > 0) OR coalesce(b."allowedMimeTypes",'')='')))::int FROM file f) to stdout with (format csv)
""" % ("\n".join(named), LIVE_W, INLINE_W, LIVE_W, LIVE_W, INLINE_M, LIVE_W, LIVE_W)
rows = run(db, SQL1).strip()

SQL2 = r"""
\set ON_ERROR_STOP on
CREATE TEMP TABLE bc (ext text, size bigint, rejected int, named int, wb_only int, wb_any int, memo_only int, memo_any int, office int, month text, b5 int, nolimit int);
COPY bc FROM STDIN WITH (format csv);
%s
\.
CREATE TEMP TABLE led AS
  SELECT o."externalID" AS ext, o.size, bool_or(t.state = 'stored') AS stored, max(t."verifiedAt") AS verified
    FROM file_backup_object o LEFT JOIN file_backup_target_status t ON t."externalID" = o."externalID" GROUP BY 1, 2;
\pset format aligned
\pset tuples_only off
\echo === blob ledger check
\echo --- off-site ledger: objects, bytes, stored, not stored, first and last verification
SELECT count(*) AS objects, pg_size_pretty(sum(size)) AS bytes, count(*) FILTER (WHERE stored) AS stored,
       count(*) FILTER (WHERE NOT coalesce(stored,false)) AS not_stored, min(verified)::date AS first_verified, max(verified)::date AS last_verified FROM led;
\echo --- blobs per class of file row: with a stored record, and with no record
WITH c AS (
            SELECT '01 all file rows' AS cls, ext, size FROM bc
  UNION ALL SELECT '02 kept file rows', ext, size FROM bc WHERE rejected = 0
  UNION ALL SELECT '03 rejected file rows', ext, size FROM bc WHERE rejected = 1
  UNION ALL SELECT '04 rejected, blob not shared with a kept row', ext, size FROM bc b WHERE rejected = 1 AND NOT EXISTS (SELECT 1 FROM bc k WHERE k.ext = b.ext AND k.rejected = 0)
  UNION ALL SELECT '05 rejected files named by a live body (script 41)', ext, size FROM bc WHERE named = 1
  UNION ALL SELECT '06 live whiteboard body, any', ext, size FROM bc WHERE wb_any = 1
  UNION ALL SELECT '07 live whiteboard body, only in file storage', ext, size FROM bc WHERE wb_only = 1
  UNION ALL SELECT '08 live memo body, any', ext, size FROM bc WHERE memo_any = 1
  UNION ALL SELECT '09 live memo body, only in file storage', ext, size FROM bc WHERE memo_only = 1
  UNION ALL SELECT '10 live office document body', ext, size FROM bc WHERE office = 1
  UNION ALL SELECT '11 file outside its bucket limits (B5)', ext, size FROM bc WHERE b5 = 1
  UNION ALL SELECT '12 file in a bucket with no limit (B5 G3)', ext, size FROM bc WHERE nolimit = 1),
b AS (SELECT cls, ext, count(*) AS file_rows, max(size) AS size FROM c GROUP BY 1, 2)
SELECT cls, sum(file_rows) AS file_rows, count(*) AS blobs,
       count(*) FILTER (WHERE l.stored) AS stored_record,
       count(*) FILTER (WHERE l.ext IS NULL OR NOT l.stored) AS no_record,
       coalesce(sum(b.file_rows) FILTER (WHERE l.ext IS NULL OR NOT l.stored), 0) AS rows_on_those,
       coalesce(pg_size_pretty(sum(b.size) FILTER (WHERE l.ext IS NULL OR NOT l.stored)), '0') AS bytes_no_record
  FROM b LEFT JOIN led l ON l.ext = b.ext GROUP BY 1 ORDER BY 1;
\echo --- blobs with no stored record, by the month their first file row was created
SELECT m AS first_row_month, count(*) AS blobs, pg_size_pretty(sum(size)) AS bytes, count(*) FILTER (WHERE office = 1) AS office_document_bodies
  FROM (SELECT bc.ext, min(month) AS m, max(bc.size) AS size, max(office) AS office FROM bc LEFT JOIN led l ON l.ext = bc.ext AND l.stored WHERE l.ext IS NULL GROUP BY 1) q
 GROUP BY 1 ORDER BY 1;
\echo --- ledger objects that no file row names (info)
SELECT count(*) AS objects, pg_size_pretty(sum(size)) AS bytes FROM led l WHERE NOT EXISTS (SELECT 1 FROM bc WHERE bc.ext = l.ext);
\echo --- size differs between file row and ledger (expect 0)
SELECT count(DISTINCT bc.ext) AS blobs FROM bc JOIN led l ON l.ext = bc.ext WHERE bc.size <> l.size;
\pset format unaligned
\pset tuples_only on
\echo --- blob ledger VERDICT: live body blobs with no off-site record (whiteboard | memo | office document; expect 0 | 0 | 0)
SELECT (SELECT count(DISTINCT bc.ext) FROM bc LEFT JOIN led l ON l.ext = bc.ext AND l.stored WHERE bc.wb_any = 1 AND l.ext IS NULL),
       (SELECT count(DISTINCT bc.ext) FROM bc LEFT JOIN led l ON l.ext = bc.ext AND l.stored WHERE bc.memo_any = 1 AND l.ext IS NULL),
       (SELECT count(DISTINCT bc.ext) FROM bc LEFT JOIN led l ON l.ext = bc.ext AND l.stored WHERE bc.office = 1 AND l.ext IS NULL);
""" % rows
print("(%s file rows from %s; ledger from %s; %d named files)" % (rows.count("\n") + 1, db, fdb, len(named)))
print(run(fdb, SQL2))
