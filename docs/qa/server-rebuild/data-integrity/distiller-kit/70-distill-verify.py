#!/usr/bin/env python3
"""70-distill-verify.py: after 69-distill-copy.py, prove that the copy made no new orphan.
Runs the unmodified classifier (file 30, steps 1 and 2) on the source and on the new database and compares:
  V1  rows marked in the new database that are NOT marked in the source: must be 0
      (a row that became ownerless because its owner was not copied)
  V2  rows marked in the new database must all be exceptions kept by a ruling: marked in the source
      and not on the reject list of the copy (69-reject-list.csv), or the table kept whole by K2
  V3  kept exceptions that are no longer marked in the new database (repaired by the copy, K3): listed
Read only. Prints counts and rule names, never an id.
usage: 70-distill-verify.py <source_db> <new_db> <label>"""
import subprocess, csv, io, collections, os, sys
if len(sys.argv) != 4: sys.exit(__doc__)
SRC, NEW, LABEL = sys.argv[1:]
here = os.path.dirname(os.path.abspath(__file__)); C = os.environ.get('DOCKER', 'alkemio_dev_postgres'); U = os.environ.get('PGUSER_', 'synapse')
cl = open(os.path.join(here, '30-architect-classifier-reconstruction.sql'), encoding='utf-8').read().split('\n')
b = next(i for i, l in enumerate(cl) if l.startswith('\\echo === 3 per-table classification'))
sql = '\\o /dev/null\n' + '\n'.join(l for l in cl[:b] if not l.startswith('\\echo')) + "\n\\o\n\\copy (SELECT tbl,id,rule FROM orphan) TO STDOUT WITH (FORMAT csv)\n"
def run(db):
    r = subprocess.run(['docker', 'exec', '-i', C, 'psql', '-U', U, '-d', db, '-X', '-q'], input=sql, capture_output=True, text=True)
    return {(t, i): ru for t, i, ru in csv.reader(io.StringIO(r.stdout))}
src, new = run(SRC), run(NEW)
mine = {(t, i) for t, i, ru, rd in csv.reader(open(os.path.join(here, 'runs', LABEL, '69-reject-list.csv')))}
whole = '_agent_backup_virtual_contributor'
print(f'=== 70 distill verify: source {SRC}, new {NEW}')
print(f'--- marked by the unmodified classifier: source {len(src)}, new database {len(new)}; reject list of the copy {len(mine)}')
v1 = set(new) - set(src)
print(f'--- V1 marked in the new database and not in the source (expect 0): {len(v1)}')
for k, v in sorted(collections.Counter((t, new[(t, i)]) for t, i in v1).items()): print(f'      {k[0]} | {k[1]} | {v}')
exp = {x for x in src if x not in mine or x[0] == whole}
v2 = set(new) - exp
print(f'--- V2 marked in the new database and not a kept exception (expect 0): {len(v2)}')
print(f'--- kept exceptions still marked in the new database, by table and rule (these stay marked by ruling):')
for k, v in sorted(collections.Counter((t, ru) for (t, i), ru in new.items()).items()): print(f'      {k[0]} | {k[1]} | {v}')
v3 = exp - set(new)
print(f'--- V3 kept exceptions that are no longer marked in the new database (the copy repaired them, K3): {len(v3)}')
for k, v in sorted(collections.Counter((t, src[(t, i)]) for t, i in v3).items()): print(f'      {k[0]} | {k[1]} | {v}')
ok = not v1 and not v2
print(f'=== 70 VERDICT: {"PASS" if ok else "FAIL"}'); sys.exit(0 if ok else 1)
