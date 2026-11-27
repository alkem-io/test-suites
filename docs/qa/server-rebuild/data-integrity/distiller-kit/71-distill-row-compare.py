#!/usr/bin/env python3
"""71-distill-row-compare.py: prove that every row of the copy is the same as its source row.
Restores nothing itself: give it two databases. For every table it reads id and md5(row as text) from both
and reports: rows only in the copy (must be 0), rows whose content differs (must be explained), rows only in the source
(the rejected and skipped rows; must equal the reject list of file 69).
Tables with no id column are compared as whole-row sets. Read only. Counts only.
usage: 71-distill-row-compare.py <source_db> <copy_db> [label]"""
import subprocess, sys, os, csv, collections
SRC, NEW = sys.argv[1], sys.argv[2]; LABEL = sys.argv[3] if len(sys.argv) > 3 else None
C = os.environ.get('DOCKER', 'alkemio_dev_postgres'); U = os.environ.get('PGUSER_', 'synapse')
here = os.path.dirname(os.path.abspath(__file__))
def q(db, sql):
    r = subprocess.run(['docker', 'exec', '-i', C, 'psql', '-U', U, '-d', db, '-X', '-q', '-At', '-F', '|'], input=sql, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-800:])
    return r.stdout.splitlines()
tables = q(SRC, "select tablename from pg_tables where schemaname='public' order by 1")
hasid = set(q(SRC, "select table_name from information_schema.columns where table_schema='public' and column_name='id'"))
rej = collections.Counter()
if LABEL:
    for t, i, ru, rd in csv.reader(open(os.path.join(here, 'runs', LABEL, '69-reject-list.csv'))): rej[t] += 1
tot = collections.Counter(); bad = []
print(f'=== 71 row compare: source {SRC}, copy {NEW}')
print(f'    {"table":40} {"source":>8} {"copy":>8} {"same":>8} {"differ":>7} {"only copy":>9} {"only src":>9} {"rejected":>9}')
for t in tables:
    key = 'id::text' if t in hasid else "''"
    sql = f'select {key}, md5(x::text) from "{t}" x'
    a = collections.Counter(q(SRC, sql)); b = collections.Counter(q(NEW, sql))
    if t in hasid:
        da = dict(l.split('|') for l in a); db = dict(l.split('|') for l in b)
        same = sum(1 for k in db if da.get(k) == db[k]); differ = sum(1 for k in db if k in da and da[k] != db[k])
        onlyc = sum(1 for k in db if k not in da); onlys = sum(1 for k in da if k not in db)
    else:
        same = sum((a & b).values()); differ = 0; onlyc = sum((b - a).values()); onlys = sum((a - b).values())
    for k, v in (('source', sum(a.values())), ('copy', sum(b.values())), ('same', same), ('differ', differ), ('onlyc', onlyc), ('onlys', onlys)): tot[k] += v
    flag = differ or onlyc or (LABEL and not t.startswith('_') and onlys != rej.get(t, 0))
    if flag: bad.append(t)
    if flag or onlys: print(f'    {t:40} {sum(a.values()):8} {sum(b.values()):8} {same:8} {differ:7} {onlyc:9} {onlys:9} {rej.get(t, 0) if LABEL else "":>9}{"  <--" if flag else ""}')
print(f'    {"all tables":40} {tot["source"]:8} {tot["copy"]:8} {tot["same"]:8} {tot["differ"]:7} {tot["onlyc"]:9} {tot["onlys"]:9}')
print(f'=== 71 tables to look at: {len(bad)} {bad}')
