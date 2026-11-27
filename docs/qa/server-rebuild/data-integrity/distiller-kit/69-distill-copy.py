#!/usr/bin/env python3
"""69-distill-copy.py: build a NEW database that holds only the rows that are not rejected.
(2026-11-16, QA experiment; the reference result to compare a distiller with.)

It never writes to the source database: it reads it in one session (temp tables only) and
exports the kept rows. The new database must not exist yet and its name must start with distill_.

What "not rejected" means here
  1. The reject set is the one of the classifier (file 30, steps 1 and 2: direct orphan rules and
     their dependants), with the accepted rulings applied:
       K1 (A7)  a virtual contributor whose knowledge source is gone is KEPT: its rule is switched
                off before the dependants are computed, so nothing below it is marked either.
       K2 (A1)  every table whose name starts with "_" is skipped as a whole, except
                _agent_backup_virtual_contributor, which is copied as a whole (the only map for C3).
       K3 (A6)  the files that a live whiteboard body shows are KEPT with their policy and tag set,
                and get the storage bucket of that whiteboard (the accepted repair; without it the
                database refuses the row). Needs the pairs file of 41-inline-body-scan.py.
       K4 (A8)  a credential that gives a right on a rejected row is rejected with it. No foreign key
                protects that pointer, so without this rule the credential would point at nothing.
  2. After the load, every foreign key of the source schema is checked on the new database. A kept
     row that points at a row that was not copied is handled the way the database itself would
     handle the deletion of that row: ON DELETE CASCADE removes the child, ON DELETE SET NULL empties
     the pointer. Any other rule stops the run. Every such row is counted per foreign key in the
     report: these are rows the classifier does not mark and the schema still takes away.
  Bug heritage rows (class B) and class C rows are copied as stored. No repair runs here.

usage: 69-distill-copy.py <source_db> <new_db> <label> [--pairs runs/<...>/body-pairs.txt]
env:   DOCKER  container name (default alkemio_dev_postgres), PGUSER_ (default synapse)
output: runs/<label>/69-report.txt (counts only), runs/<label>/69-reject-list.csv (ids, mode 600, local only)
"""
import os, re, subprocess, sys, time
here = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[1:]
PAIRS = argv[argv.index('--pairs') + 1] if '--pairs' in argv else None
args = [a for a in argv if not a.startswith('--') and a != PAIRS]
if len(args) != 3: sys.exit(__doc__)
SRC, NEW, LABEL = args
C = os.environ.get('DOCKER', 'alkemio_dev_postgres'); U = os.environ.get('PGUSER_', 'synapse')
assert re.fullmatch(r'distill_[a-z0-9_]+', NEW), 'the new database name must match distill_[a-z0-9_]+'
assert NEW != SRC
out = os.path.join(here, 'runs', LABEL); os.makedirs(out, exist_ok=True)
TMP = f"{os.environ.get('KIT_TMP', '/tmp')}/{NEW}"   # KIT_TMP: in the pod the work volume, not the disk of the pod
rep = open(os.path.join(out, '69-report.txt'), 'w', encoding='utf-8')
def say(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); rep.write(s + '\n'); rep.flush()
def psql(db, sql, stop=True, tuples=True):
    cmd = ['docker', 'exec', '-i', C, 'psql', '-U', U, '-d', db, '-X', '-q'] + (['-At', '-F', '|'] if tuples else []) + (['-v', 'ON_ERROR_STOP=1'] if stop else [])
    r = subprocess.run(cmd, input=sql, capture_output=True, text=True)
    if stop and r.returncode != 0: sys.exit(f'psql failed on {db}:\n{r.stderr[-3000:]}')
    return r.stdout, r.stderr
def rows(db, sql): return [l.split('|') for l in psql(db, sql)[0].splitlines() if l]
def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0: sys.exit(f'failed: {cmd}\n{r.stderr[-3000:]}')
    return r.stdout
q = lambda n: '"' + n.replace('"', '""') + '"'
t0 = time.time()
say(f'=== 69 distill copy: source {SRC}, new database {NEW}, {time.strftime("%Y-%m-%d %H:%M")}')
if rows('postgres', f"select 1 from pg_database where datname='{NEW}'"): sys.exit(f'{NEW} exists already. Drop it yourself if you want a new run; this script never drops a database.')
before = rows(SRC, "select coalesce(sum(n_tup_ins),0), coalesce(sum(n_tup_upd),0), coalesce(sum(n_tup_del),0) from pg_stat_user_tables")[0]

# ---- the tables and their columns
tables = [r[0] for r in rows(SRC, "select tablename from pg_tables where schemaname='public' order by 1")]
cols = {}
for t, c, gen in rows(SRC, "select c.relname, a.attname, a.attgenerated from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and a.attnum>0 and not a.attisdropped order by c.relname, a.attnum"):
    if gen == '': cols.setdefault(t, []).append(c)
skip = [t for t in tables if t.startswith('_') and t != '_agent_backup_virtual_contributor']
whole = ['_agent_backup_virtual_contributor']

# ---- one read-only session on the source: classifier, rulings, export
cl = open(os.path.join(here, '30-architect-classifier-reconstruction.sql'), encoding='utf-8').read().split('\n')
a = next(i for i, l in enumerate(cl) if l.startswith('\\echo === 2 fixpoint propagation'))
b = next(i for i, l in enumerate(cl) if l.startswith('\\echo === 3 per-table classification'))
step1 = [l for l in cl[:a] if not l.startswith('\\echo')]
# steps 1 and 2 only; the guard blocks between them print and are sent to /dev/null
S = ['\\set ON_ERROR_STOP 1', '\\o /dev/null'] + step1
S += ["CREATE TEMP TABLE k1 AS SELECT id FROM orphan WHERE rule='virtual-contributor-body-of-knowledge-gone';",
      "DELETE FROM orphan WHERE rule='virtual-contributor-body-of-knowledge-gone';"]
S += [l for l in cl[a:b] if not l.startswith('\\echo')]
S += ['CREATE TEMP TABLE k3 (kind text, body text, rid text);']
if PAIRS:
    S += ["COPY k3 FROM STDIN WITH (FORMAT csv, DELIMITER '|');"] + [l for l in open(PAIRS, encoding='utf-8').read().splitlines() if l] + ['\\.']
S += ['''CREATE TEMP TABLE k3f AS SELECT DISTINCT ON (f.id) f.id AS fid, f."authorizationId" AS pol, f."tagsetId" AS ts, pr."storageBucketId" AS new_bucket
  FROM k3 JOIN file f ON f.id::text=k3.rid JOIN orphan o ON o.tbl='file' AND o.id=f.id::text
  JOIN whiteboard w ON w.id::text=k3.body JOIN profile pr ON pr.id=w."profileId"
 WHERE k3.kind='whiteboard' AND pr."storageBucketId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM orphan x WHERE x.tbl='storage_bucket' AND x.id=pr."storageBucketId"::text)
 ORDER BY f.id, w."createdDate", w.id;
DELETE FROM orphan o USING k3f WHERE o.tbl='file' AND o.id=k3f.fid::text;
DELETE FROM orphan o USING k3f WHERE o.tbl='authorization_policy' AND o.id=k3f.pol::text;
DELETE FROM orphan o USING k3f WHERE o.tbl='tagset' AND o.id=k3f.ts::text;
DELETE FROM orphan o USING k3f JOIN tagset t ON t.id=k3f.ts WHERE o.tbl='authorization_policy' AND o.id=t."authorizationId"::text;''']
S += ["""CREATE TEMP TABLE k4 AS SELECT c.id FROM credential c
 WHERE EXISTS (SELECT 1 FROM orphan o WHERE o.id = c."resourceID" AND o.tbl NOT LIKE '\\_%')
   AND NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='credential' AND o.id=c.id::text);
INSERT INTO orphan SELECT 'credential', id::text, 'k4-credential-on-a-rejected-row', 99 FROM k4;"""]
S += ['\\o', f"\\! mkdir -p {TMP}", '\\pset tuples_only on', '\\pset format unaligned', "\\pset fieldsep '|'"]
S += ["SELECT 'K4', count(*) FROM k4;", "SELECT 'K1', count(*) FROM k1;", "SELECT 'K3', count(*), count(DISTINCT new_bucket) FROM k3f;", "SELECT 'K3pairs', count(*), count(DISTINCT rid) FROM k3;"]
S += ["SELECT 'REJ', tbl, count(*) FROM orphan GROUP BY tbl ORDER BY tbl;"]
S += [f"\\copy (SELECT tbl, id, rule, round FROM orphan ORDER BY 1,2) TO '{TMP}/_reject.csv' WITH (FORMAT csv)",
      f"\\copy (SELECT fid, new_bucket FROM k3f) TO '{TMP}/_k3.csv' WITH (FORMAT csv)"]
for t in tables:
    S.append(f"SELECT 'SRC', '{t}', count(*) FROM {q(t)};")
    if t in skip: continue
    cl_ = ', '.join(q(c) for c in cols[t])
    flt = '' if (t in whole or 'id' not in cols[t]) else f" WHERE NOT EXISTS (SELECT 1 FROM orphan o WHERE o.tbl='{t}' AND o.id=x.id::text)"
    S.append(f"\\copy (SELECT {cl_} FROM {q(t)} x{flt}) TO '{TMP}/{t}.bin' WITH (FORMAT binary)")
o, e = psql(SRC, '\n'.join(S) + '\n', tuples=False)
src, rej, k = {}, {}, {}
for l in o.splitlines():
    p = l.split('|')
    if p[0] == 'SRC': src[p[1]] = int(p[2])
    elif p[0] == 'REJ': rej[p[1]] = int(p[2])
    elif p[0] in ('K1', 'K3', 'K3pairs', 'K4'): k[p[0]] = p[1:]
say(f'--- reject set: {sum(rej.values())} rows in {len(rej)} tables (classifier steps 1 and 2 with the rulings applied)')
say(f'--- K1 virtual contributors kept although their knowledge source is gone: {k["K1"][0]}')
say(f'--- K2 tables skipped as a whole: {len(skip)} tables, {sum(src[t] for t in skip)} rows; copied as a whole: {whole[0]}, {src[whole[0]]} rows')
say(f'--- K3 files kept because a live whiteboard shows them: {k["K3"][0]} files into {k["K3"][1]} buckets (pairs read: {k["K3pairs"][0]}, distinct ids {k["K3pairs"][1]})')
say(f'--- K4 credentials rejected because the row they give a right on is rejected (A8 ruling: they follow that row; the classifier does not mark them): {k["K4"][0]}')
marked_whole = rej.pop(whole[0], 0)
for t in skip: rej.pop(t, None)
unknown = [t for t in rej if t not in tables or 'id' not in cols.get(t, [])]
assert not unknown, f'reject rows for tables that cannot be filtered by id: {unknown}'
sh(f"docker exec {C} cat {TMP}/_reject.csv > '{out}/69-reject-list.csv'"); os.chmod(os.path.join(out, '69-reject-list.csv'), 0o600)

# ---- the new database: structure without constraints, then the rows
sh(f"docker exec {C} createdb -U {U} {NEW}")
sh(f"docker exec {C} pg_dump -U {U} -s --section=pre-data --no-owner {SRC} | docker exec -i {C} psql -U {U} -d {NEW} -X -q -v ON_ERROR_STOP=1")
L = ['\\set ON_ERROR_STOP 1']
for t in tables:
    if t in skip: continue
    L.append(f"\\copy {q(t)} ({', '.join(q(c) for c in cols[t])}) FROM '{TMP}/{t}.bin' WITH (FORMAT binary)")
L += ['CREATE TEMP TABLE k3n (fid uuid, new_bucket uuid);', f"\\copy k3n FROM '{TMP}/_k3.csv' WITH (FORMAT csv)",
      'UPDATE file f SET "storageBucketId" = k3n.new_bucket FROM k3n WHERE f.id = k3n.fid;']
psql(NEW, '\n'.join(L) + '\n', tuples=False)
loaded = {r[0]: int(r[1]) for t in tables if t not in skip for r in rows(NEW, f"select '{t}', count(*) from {q(t)}")}

# ---- foreign keys of the source, checked on the new database
fks = rows(SRC, """select c.conname, cl.relname, (select string_agg(quote_ident(a.attname), ',' order by x.n) from unnest(c.conkey) with ordinality x(att,n) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=x.att),
  rf.relname, (select string_agg(quote_ident(a.attname), ',' order by x.n) from unnest(c.confkey) with ordinality x(att,n) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=x.att), c.confdeltype
  from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_class rf on rf.oid=c.confrelid where c.contype='f' and c.connamespace='public'::regnamespace order by 2,1""")
fks = [f for f in fks if f[1] not in skip and f[3] not in skip]
assert all(',' not in f[2] for f in fks), 'a foreign key over several columns: not handled'
casc, nulled, stop = {}, {}, []
for rnd in range(1, 30):
    changed = 0
    for name, child, ccol, parent, pcol, rule in fks:
        cond = f'x.{ccol} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM {q(parent)} p WHERE p.{pcol} = x.{ccol})'
        n = int(rows(NEW, f'select count(*) from {q(child)} x where {cond}')[0][0])
        if not n: continue
        key = f'{child}.{ccol.strip(chr(34))} -> {parent}'
        if rule == 'c':
            psql(NEW, f'DELETE FROM {q(child)} x WHERE {cond};'); casc[key] = casc.get(key, 0) + n; changed += n
        elif rule == 'n':
            psql(NEW, f'UPDATE {q(child)} x SET {ccol} = NULL WHERE {cond};'); nulled[key] = nulled.get(key, 0) + n; changed += n
        else: stop.append((key, n, rule))
    if stop or not changed: break
say(f'--- kept rows that pointed at a row that was not copied, handled by the rule of their foreign key ({len(fks)} foreign keys checked, {rnd} round(s))')
say('    removed, as ON DELETE CASCADE would (rows the classifier does not mark):', sum(casc.values()))
for kx, n in sorted(casc.items()): say(f'      {kx}: {n}')
say('    pointer emptied, as ON DELETE SET NULL would:', sum(nulled.values()))
for kx, n in sorted(nulled.items()): say(f'      {kx}: {n}')
if stop:
    say('    STOP: rows that the schema does not allow to lose their parent (no rule):')
    for kx, n, r in stop: say(f'      {kx}: {n} (rule {r})')

# ---- constraints, indexes, sequences
sh(f"docker exec {C} pg_dump -U {U} -s --section=post-data --no-owner {SRC} > /tmp/{NEW}-post.sql; docker exec -i {C} psql -U {U} -d {NEW} -X -q < /tmp/{NEW}-post.sql 2> /tmp/{NEW}-post.err; true")
errs = open(f'/tmp/{NEW}-post.err', encoding='utf-8').read()
say(f'--- constraints and indexes of the source applied to the new database: {errs.count("ERROR")} error(s)')
for l in [l for l in errs.splitlines() if 'ERROR' in l][:20]: say('      ' + re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27}', '<id>', l)[:200])
os.remove(f'/tmp/{NEW}-post.sql'); os.remove(f'/tmp/{NEW}-post.err')
for sname, last in rows(SRC, "select sequencename, last_value from pg_sequences where schemaname='public' and last_value is not null"):
    psql(NEW, f"select setval('public.{q(sname)}', {last}, true);")
psql(NEW, 'ANALYZE;')
cnt = lambda db, kind: rows(db, f"select count(*) from pg_constraint where contype='{kind}' and connamespace='public'::regnamespace")[0][0]
ntab = rows(NEW, "select count(*) from pg_tables where schemaname='public'")[0][0]
nidx = lambda db: rows(db, "select count(*) from pg_indexes where schemaname='public'")[0][0]
say(f'--- schema check, source / new: tables {len(tables)} / {ntab}, foreign keys {cnt(SRC,"f")} / {cnt(NEW,"f")}, primary keys {cnt(SRC,"p")} / {cnt(NEW,"p")}, unique {cnt(SRC,"u")} / {cnt(NEW,"u")}, indexes {nidx(SRC)} / {nidx(NEW)}')

# ---- row accounting
final = {r[0]: int(r[1]) for t in tables for r in rows(NEW, f"select '{t}', count(*) from {q(t)}")}
cas_t = {}
for kx, n in casc.items(): cas_t[kx.split('.')[0]] = cas_t.get(kx.split('.')[0], 0) + n
say('--- row accounting per table: source = new + rejected + skipped by table rule + removed by a cascade')
say(f'    {"table":42} {"source":>8} {"new":>8} {"rejected":>8} {"skipped":>8} {"cascade":>8}')
bad = 0; tot = [0, 0, 0, 0, 0]
for t in tables:
    s, n, r, sk, ca = src[t], final[t], rej.get(t, 0), (src[t] if t in skip else 0), cas_t.get(t, 0)
    ok = s == n + r + sk + ca; bad += not ok
    for i, v in enumerate((s, n, r, sk, ca)): tot[i] += v
    if r or sk or ca or not ok: say(f'    {t:42} {s:8} {n:8} {r:8} {sk:8} {ca:8}{"" if ok else "   <-- DOES NOT ADD UP"}')
say(f'    {"all " + str(len(tables)) + " tables":42} {tot[0]:8} {tot[1]:8} {tot[2]:8} {tot[3]:8} {tot[4]:8}')
say(f'    tables copied unchanged: {sum(1 for t in tables if src[t] == final[t])}; tables that do not add up: {bad}')
say(f'    {whole[0]}: copied whole, {marked_whole} of its rows are marked by the classifier and kept by ruling K2')
after = rows(SRC, "select coalesce(sum(n_tup_ins),0), coalesce(sum(n_tup_upd),0), coalesce(sum(n_tup_del),0) from pg_stat_user_tables")[0]
say(f'--- source untouched: inserted | updated | deleted row counters of the source before {" | ".join(before)} and after {" | ".join(after)}: {"EQUAL" if before == after else "CHANGED (another client may be writing: check)"}')
sh(f"docker exec {C} rm -rf {TMP}")
say(f'--- sizes: source {rows(SRC, "select pg_size_pretty(pg_database_size(current_database()))")[0][0]}, new {rows(NEW, "select pg_size_pretty(pg_database_size(current_database()))")[0][0]}')
verdict = 'PASS' if not stop and errs.count('ERROR') == 0 and bad == 0 else 'FAIL'
say(f'=== 69 VERDICT: {verdict} ({int(time.time() - t0)} s)')
sys.exit(0 if verdict == 'PASS' else 1)
