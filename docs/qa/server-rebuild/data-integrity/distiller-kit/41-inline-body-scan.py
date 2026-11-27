#!/usr/bin/env python3
"""41-inline-body-scan.py: read the inline copies of live whiteboard and memo
bodies and look for rejected ids and file links inside them.

Why: the SQL guards cannot read these bodies. A whiteboard body is stored
zlib-compressed and base64-encoded, a memo body is a binary Yjs update. A text
match in SQL (A6 G1) never fires on them. This script unpacks them.

Limits, stated in the output:
  - it reads the INLINE copy in the database. The current body lives in file
    storage and may be newer. Rows without an inline copy are not read.
  - it prints counts only. Bodies and ids stay in memory.

Needs /tmp/closure-ids.txt (id|kinds) on the machine psql runs on, written by
38-reject-closure-scan.sql. Run after run-guards.sh, same PSQL, same database.

usage: 41-inline-body-scan.py [alkemio_db] [pairs_file]
       pairs_file  optional: write "kind|live body id|rejected id" there, to
                   look the hits up afterwards. It holds ids: keep it local.
env:   PSQL  psql command prefix without -d
             default: docker exec -i alkemio_dev_postgres psql -U synapse
"""
import base64, collections, csv, io, os, re, shlex, subprocess, sys, zlib

db = sys.argv[1] if len(sys.argv) > 1 else "alkemio"
pairs_file = sys.argv[2] if len(sys.argv) > 2 else None
pairs = []
psql = shlex.split(os.environ.get("PSQL", "docker exec -i alkemio_dev_postgres psql -U synapse"))
SQL = r"""
\set ON_ERROR_STOP on
CREATE TEMP TABLE rid (id text, kinds text);
\copy rid from '/tmp/closure-ids.txt' with (format csv, delimiter '|')
\copy (SELECT 'R', id, kinds FROM rid) to stdout with (format csv)
\copy (SELECT 'W', w.id::text, w.content FROM whiteboard w WHERE NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = w.id::text)) to stdout with (format csv)
\copy (SELECT 'M', m.id::text, encode(m.content, 'base64') FROM memo m WHERE NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = m.id::text)) to stdout with (format csv)
"""
p = subprocess.run(psql + ["-d", db, "-X", "-q", "-At"], input=SQL.encode(), capture_output=True)
if p.returncode != 0:
    sys.exit("psql failed: " + p.stderr.decode()[-400:])
csv.field_size_limit(1 << 30)
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
rejected = {}
stats = {k: collections.Counter() for k in ("whiteboard", "memo")}
hits = collections.Counter()

def unpack_whiteboard(text):
    """base64 of the UTF-8 form of a zlib byte string; fall back to raw."""
    try:
        raw = base64.b64decode(text)
    except Exception:
        return text, "plain"
    for cand in (lambda: raw.decode("utf-8").encode("latin-1"), lambda: raw):
        try:
            return zlib.decompress(cand()).decode("utf-8", "replace"), "unpacked"
        except Exception:
            pass
    return text, "not unpacked"

for row in csv.reader(io.StringIO(p.stdout.decode("utf-8", "replace"))):
    if len(row) != 3:
        continue
    kind, id_, body = row
    if kind == "R":
        rejected[id_] = body
        continue
    name = "whiteboard" if kind == "W" else "memo"
    st = stats[name]
    st["live rows"] += 1
    if len(body) <= 2:
        st["no inline copy (not read)"] += 1
        continue
    if kind == "W":
        text, how = unpack_whiteboard(body)
    else:
        text, how = base64.b64decode(body).decode("latin-1"), "unpacked"
    st["inline copy " + how] += 1
    if "/document/" in text:
        st["bodies with a file link"] += 1
    ids = set(UUID.findall(text))
    if ids:
        st["bodies naming any id"] += 1
    bad = [i for i in ids if i in rejected and i != id_]
    if bad:
        st["BODIES NAMING A REJECTED ID"] += 1
        for i in bad:
            hits[(name, rejected[i])] += 1
            pairs.append("%s|%s|%s" % (name, id_, i))

print("=== inline body scan (%s, %d rejected ids)" % (db, len(rejected)))
for name, st in stats.items():
    for k in ("live rows", "no inline copy (not read)", "inline copy unpacked", "inline copy plain",
              "inline copy not unpacked", "bodies naming any id", "bodies with a file link", "BODIES NAMING A REJECTED ID"):
        print("%-10s %-30s %6d" % (name, k, st.get(k, 0)))
print("--- rejected ids named in a live body, by kind (expect none)")
for (name, kinds), n in sorted(hits.items()):
    print("%-10s %-40s %6d" % (name, kinds, n))
print("--- inline body scan VERDICT: live bodies naming a rejected id = %d (expect 0)"
      % sum(st.get("BODIES NAMING A REJECTED ID", 0) for st in stats.values()))

# Is the break visible today? The file service checks the policy of the file
# row, not of its bucket, so a rejected file can still be served. Count the
# rejected files named by a live body by the widest reader their policy admits.
named = sorted({x.split("|")[2] for x in pairs})
if named:
    SQL2 = r"""
\set ON_ERROR_STOP on
CREATE TEMP TABLE rid (id text, kinds text);
\copy rid from '/tmp/closure-ids.txt' with (format csv, delimiter '|')
CREATE TEMP TABLE named (id text);
COPY named FROM STDIN;
""" + "\n".join(named) + r"""
\.
WITH rf AS (
  SELECT n.id, f.id AS fid, ap.id AS pol, ap."credentialRules" AS cr
    FROM named n LEFT JOIN file f ON f.id::text = n.id
    LEFT JOIN authorization_policy ap ON ap.id = f."authorizationId"),
rd AS (
  SELECT rf.id, c->>'type' AS ctype,
         EXISTS (SELECT 1 FROM space sp WHERE sp.id::text = c->>'resourceID'
                    AND NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = sp.id::text)) AS kept_space
    FROM rf,
         jsonb_array_elements(CASE WHEN jsonb_typeof(rf.cr)='array' THEN rf.cr ELSE '[]'::jsonb END) r,
         jsonb_array_elements(CASE WHEN jsonb_typeof(r->'criterias')='array' THEN r->'criterias' ELSE '[]'::jsonb END) c
   WHERE r->'grantedPrivileges' ? 'read'),
w AS (
  SELECT rf.id,
         CASE WHEN bool_and(rf.fid IS NULL) THEN '7 not a file'
              WHEN bool_and(rf.pol IS NULL) THEN '6 no policy: denied to everyone'
              WHEN bool_or(rd.ctype='global-anonymous') THEN '1 anyone, signed in or not'
              WHEN bool_or(rd.ctype='global-registered') THEN '2 any signed-in user'
              WHEN bool_or(rd.ctype LIKE 'space-%' AND rd.kept_space) THEN '3 members or admins of a kept space'
              WHEN bool_or(rd.ctype IS NOT NULL) THEN '4 platform roles, the uploader, or roles on something gone'
              ELSE '5 policy without a read rule: denied to everyone' END AS widest_reader
    FROM rf LEFT JOIN rd ON rd.id = rf.id GROUP BY rf.id)
SELECT widest_reader || '|' || count(*) FROM w GROUP BY widest_reader ORDER BY 1;
"""
    q = subprocess.run(psql + ["-d", db, "-X", "-q", "-At"], input=SQL2.encode(), capture_output=True)
    if q.returncode != 0:
        sys.exit("psql failed: " + q.stderr.decode()[-400:])
    print("--- rejected ids named in a live body: %d distinct, by the widest reader of the file today" % len(named))
    for line in q.stdout.decode().splitlines():
        if "|" in line:
            k, n = line.rsplit("|", 1)
            print("%-62s %6s" % (k, n))
if pairs_file:
    with open(pairs_file, "w") as fh:
        fh.write("\n".join(pairs) + ("\n" if pairs else ""))
