#!/usr/bin/env python3
"""43-file-store-body-scan.py: read the bodies that live in file storage and
look for rejected ids inside them.

Why: 41-inline-body-scan.py reads only the inline copies in the database. The
current body of a whiteboard or memo is a Yjs snapshot in file storage, found
through "contentPointer". An office document has no inline copy at all. This
script reads those blobs from a local folder.

It never fetches anything. Two steps:
  1. keys   write the list of blobs to fetch, with sizes. Fetch them yourself
            from the primary file store or from the off-site backup bucket
            (object key = <hash[0:2]>/<hash[2:4]>/<hash>, see
            43-fetch-blobs.sh), into an empty folder.
  2. scan   read the folder. For every blob: check that its SHA-256 equals the
            hash in the file row (proves the object is the right one), unpack
            it (Yjs snapshots are read as bytes, office documents and other
            zip files member by member, PDF streams inflated) and look for
            rejected ids and file links.

For bodies whose inline copy is still current, the scan compares the rejected
ids named by the stored body with those named by the inline copy. That is the
check that reading a Yjs snapshot as bytes finds what the JSON form finds.

Limits, stated in the output:
  - a blob that is not in the folder is not read; the count is printed.
  - it prints counts only. Bodies and ids stay in memory.
The blobs are untrusted data: run with  python3 -I  and keep the folder apart.

Needs /tmp/closure-ids.txt (id|kinds) on the machine psql runs on, written by
38-reject-closure-scan.sql. Run after run-guards.sh, same PSQL, same database.

usage: 43-file-store-body-scan.py keys <out_file> [alkemio_db] [all|gap]
           gap (default): bodies with no current inline copy, plus office
                          documents. all: every live body.
       43-file-store-body-scan.py scan <blob_dir> [alkemio_db] [pairs_file]
           pairs_file  optional: write "kind|live body id|rejected id" there.
                       It holds ids: keep it local.
env:   PSQL  psql command prefix without -d
             default: docker exec -i alkemio_dev_postgres psql -U synapse
"""
import base64, collections, csv, hashlib, io, os, re, shlex, subprocess, sys, zipfile, zlib

if len(sys.argv) < 3 or sys.argv[1] not in ("keys", "scan"):
    sys.exit(__doc__)
mode, target = sys.argv[1], sys.argv[2]
db = sys.argv[3] if len(sys.argv) > 3 else "alkemio"
extra = sys.argv[4] if len(sys.argv) > 4 else None
psql = shlex.split(os.environ.get("PSQL", "docker exec -i alkemio_dev_postgres psql -U synapse"))
SQL = r"""
\set ON_ERROR_STOP on
CREATE TEMP TABLE rid (id text, kinds text);
\copy rid from '/tmp/closure-ids.txt' with (format csv, delimiter '|')
\copy (SELECT 'R', id, kinds, '', '', '' FROM rid) to stdout with (format csv)
\copy (SELECT 'W', w.id::text, f."externalID", f.size, (length(coalesce(w.content,'')) > 2 AND coalesce(w."contentVersion",0) = 0)::int, CASE WHEN length(coalesce(w.content,'')) > 2 AND coalesce(w."contentVersion",0) = 0 THEN w.content ELSE '' END FROM whiteboard w LEFT JOIN file f ON f.id::text = w."contentPointer" WHERE NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = w.id::text)) to stdout with (format csv)
\copy (SELECT 'M', m.id::text, f."externalID", f.size, (length(coalesce(m.content,''::bytea)) > 2 AND coalesce(m."contentVersion",0) = 0)::int, CASE WHEN length(coalesce(m.content,''::bytea)) > 2 AND coalesce(m."contentVersion",0) = 0 THEN encode(m.content,'base64') ELSE '' END FROM memo m LEFT JOIN file f ON f.id::text = m."contentPointer" WHERE NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = m.id::text)) to stdout with (format csv)
\copy (SELECT 'O', d.id::text, f."externalID", f.size, 0, '' FROM collabora_document d LEFT JOIN file f ON f.id = d."documentId" WHERE NOT EXISTS (SELECT 1 FROM rid r WHERE r.id = d.id::text)) to stdout with (format csv)
"""
p = subprocess.run(psql + ["-d", db, "-X", "-q", "-At"], input=SQL.encode(), capture_output=True)
if p.returncode != 0:
    sys.exit("psql failed: " + p.stderr.decode()[-400:])
csv.field_size_limit(1 << 30)
UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
NAMES = {"W": "whiteboard", "M": "memo", "O": "office doc"}
rejected, bodies = {}, []
for row in csv.reader(io.StringIO(p.stdout.decode("utf-8", "replace"))):
    if len(row) != 6:
        continue
    if row[0] == "R":
        rejected[row[1]] = row[2]
    else:
        bodies.append(row)

def shard(h):
    return "%s/%s/%s" % (h[0:2], h[2:4], h)

if mode == "keys":
    scope = extra or "gap"
    want = collections.OrderedDict()
    per = collections.Counter()
    for kind, id_, ext, size, inline, _ in bodies:
        if not ext:
            per[(NAMES[kind], "live rows without a body file")] += 1
            continue
        if scope == "gap" and kind in "WM" and inline == "1":
            continue
        per[(NAMES[kind], "live rows wanted")] += 1
        if ext not in want:
            want[ext] = int(size or 0)
            per[(NAMES[kind], "blobs")] += 1
            per[(NAMES[kind], "bytes")] += int(size or 0)
    with open(target, "w") as fh:
        for ext in want:
            fh.write(shard(ext) + "\n")
    print("=== file store body scan: keys (%s, scope %s)" % (db, scope))
    for (name, k), n in sorted(per.items()):
        print("%-10s %-32s %12d" % (name, k, n))
    print("total      %-32s %12d" % ("blobs", len(want)))
    print("total      %-32s %12d" % ("bytes", sum(want.values())))
    print("keys written to %s (content hashes only, no ids)" % target)
    sys.exit(0)

def unpack_whiteboard_inline(text):
    try:
        raw = base64.b64decode(text)
    except Exception:
        return text
    for cand in (lambda: raw.decode("utf-8").encode("latin-1"), lambda: raw):
        try:
            return zlib.decompress(cand()).decode("utf-8", "replace")
        except Exception:
            pass
    return text

CAP = 256 << 20   # per zip member and per inflated stream: guard against bombs
STREAM = re.compile(rb"stream\r?\n(.*?)\r?\nendstream", re.S)

def texts(blob):
    """every byte string worth searching: the blob itself, zip members, inflated PDF streams."""
    yield blob
    if blob[:2] == b"PK":
        try:
            with zipfile.ZipFile(io.BytesIO(blob)) as z:
                for info in z.infolist():
                    if info.file_size <= CAP:
                        with z.open(info) as fh:
                            yield fh.read(CAP)
        except Exception:
            pass
    elif blob[:4] == b"%PDF":
        for m in STREAM.finditer(blob):
            try:
                yield zlib.decompressobj().decompress(m.group(1), CAP)
            except Exception:
                pass

def ids_in(blob):
    found, link = set(), False
    for t in texts(blob):
        s = t.decode("latin-1")
        found.update(UUID.findall(s))
        link = link or "/storage/document/" in s
    return found, link

def find(ext):
    for cand in (os.path.join(target, shard(ext)), os.path.join(target, ext)):
        if os.path.isfile(cand):
            return cand
    return None

pairs_file, pairs = extra, []
stats = {n: collections.Counter() for n in NAMES.values()}
hits = collections.Counter()
for kind, id_, ext, size, inline, content in bodies:
    name, st = NAMES[kind], stats[NAMES[kind]]
    st["live rows"] += 1
    gap = not (kind in "WM" and inline == "1")
    if kind in "WM":
        st["  body only in file storage" if gap else "  inline copy still current"] += 1
    if not ext:
        st["no body file row (not read)"] += 1
        continue
    path = find(ext)
    if not path:
        st["blob not in folder (not read)"] += 1
        if gap:
            st["  of those, only in file storage"] += 1
        continue
    with open(path, "rb") as fh:
        blob = fh.read()
    st["blob read"] += 1
    if gap:
        st["  read, only in file storage"] += 1
    if hashlib.sha256(blob).hexdigest() != ext:
        st["HASH DIFFERS FROM FILE ROW"] += 1
    ids, link = ids_in(blob)
    if link:
        st["bodies with a file link"] += 1
    if ids:
        st["bodies naming any id"] += 1
    bad = {i for i in ids if i in rejected and i != id_}
    if bad:
        st["BODIES NAMING A REJECTED ID"] += 1
        if gap:
            st["  NAMING A REJECTED ID, only in file storage"] += 1
        for i in bad:
            hits[(name, rejected[i])] += 1
            pairs.append("%s|%s|%s" % (name, id_, i))
    if not gap:
        text = unpack_whiteboard_inline(content) if kind == "W" else base64.b64decode(content).decode("latin-1")
        ibad = {i for i in UUID.findall(text) if i in rejected and i != id_}
        st["compared with the inline copy"] += 1
        if ibad != bad:
            st["STORED AND INLINE NAME DIFFERENT REJECTED IDS"] += 1
            if ibad - bad:
                st["  inline names one the stored body does not"] += 1
            if bad - ibad:
                st["  stored body names one the inline does not"] += 1

ORDER = ("live rows", "  inline copy still current", "  body only in file storage", "no body file row (not read)",
         "blob not in folder (not read)", "  of those, only in file storage", "blob read", "  read, only in file storage",
         "HASH DIFFERS FROM FILE ROW", "bodies naming any id", "bodies with a file link", "BODIES NAMING A REJECTED ID",
         "  NAMING A REJECTED ID, only in file storage", "compared with the inline copy",
         "STORED AND INLINE NAME DIFFERENT REJECTED IDS", "  inline names one the stored body does not",
         "  stored body names one the inline does not")
print("=== file store body scan (%s, %d rejected ids, blobs from %s)" % (db, len(rejected), target))
for name, st in stats.items():
    for k in ORDER:
        if name == "office doc" and ("inline" in k or "only in file storage" in k):
            continue
        print("%-10s %-48s %6d" % (name, k, st.get(k, 0)))
print("--- rejected ids named in a stored body, by kind (expect none)")
for (name, kinds), n in sorted(hits.items()):
    print("%-10s %-40s %6d" % (name, kinds, n))
tot = lambda k: sum(st.get(k, 0) for st in stats.values())
print("--- file store body scan VERDICT: stored bodies naming a rejected id = %d (expect 0); not read = %d; hash differs = %d; stored and inline disagree = %d"
      % (tot("BODIES NAMING A REJECTED ID"), tot("blob not in folder (not read)") + tot("no body file row (not read)"),
         tot("HASH DIFFERS FROM FILE ROW"), tot("STORED AND INLINE NAME DIFFERENT REJECTED IDS")))
if pairs_file:
    with open(pairs_file, "w") as fh:
        fh.write("\n".join(sorted(set(pairs))) + ("\n" if pairs else ""))
