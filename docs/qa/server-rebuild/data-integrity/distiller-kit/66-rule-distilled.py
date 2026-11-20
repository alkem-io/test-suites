#!/usr/bin/env python3
"""66-rule-distilled.py: give every guard that is still `undecided` for the new database an expectation, from how it
reads at the three stages of one dataset: source backup, copied state, repaired state (three run folders of
run-guards.sh). The rule, the same for every guard:
  reads the same on source and repaired state              -> as-source   (copy and repairs must not move it)
  reads nothing on the repaired state, something on source -> empty       (what it lists is rejected or repaired)
  every number 0 on the repaired state, not on the source  -> zero
  anything else                                            -> agreed      (the value depends on the data; the reading of
                                                                           the repaired state is stored as the agreed one)
The reason column records the class and the stage that moves the guard (copy = the rejects, repairs). The rule sets
WHAT KIND of check a guard gets. It does not prove that today's reading is right: `agreed` pins the reading that passed
the application tests of 2026-11-16/17, so that any later change is caught and read by a person.
usage: 66-rule-distilled.py <source label> <copied label> <repaired label> [--apply]     (without --apply: prints counts)"""
import importlib.util, os, sys, collections, datetime
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('gs', os.path.join(here, '66-guard-summary.py')); gs = importlib.util.module_from_spec(spec); spec.loader.exec_module(gs)
args = [a for a in sys.argv[1:] if not a.startswith('--')]; APPLY = '--apply' in sys.argv
if len(args) != 3: sys.exit(__doc__)
exp, slots, order = gs.load_expectations()
def load(label):
    run = os.path.join(here, 'runs', label); out = {}; seen = set()
    for f in sorted(os.listdir(run)):
        s = gs.slot_of(f)
        if s is None or s in seen or not os.path.isfile(os.path.join(run, f)): continue
        seen.add(s)
        blocks, _ = gs.parse(os.path.join(run, f), {k for (es, k), v in exp.items() if es == s and v[0] == 'note'}, {k for (es, k) in exp if es == s})
        for b in blocks: out[(s, b.key)] = b
    return out
S, C, R = (load(a) for a in args); today = datetime.date.today().isoformat(); new = {}; cls = collections.Counter()
for k, (src, dis, why) in exp.items():
    if dis != 'undecided': continue
    s, c, r = S.get(k), C.get(k), R.get(k)
    if s is None or r is None: cls['left undecided: not in the source or the repaired run'] += 1; continue
    stage = ' and '.join(x for x in ('the copy' if c is not None and c.digest() != s.digest() else '', 'the repairs' if c is not None and c.digest() != r.digest() else '') if x) or 'a stage not run'
    if r.digest() == s.digest(): kind, text = 'as-source', 'not moved by the copy or the repairs'
    elif r.rows() + len(r.free) == 0: kind, text = 'empty', 'reads nothing after ' + stage
    elif not r.nonzero(): kind, text = 'zero', 'every number 0 after ' + stage
    else: kind, text = 'agreed', 'moved by ' + stage + ' to a value that depends on the data'
    cls[kind] += 1; new[k] = (kind, f'{why} | new database, ruled {today}: {text}')
print('undecided guards ruled:', dict(cls))
if APPLY:
    p = gs.EXPECT; out = []
    for line in open(p, encoding='utf-8'):
        f = line.rstrip('\n').split('\t')
        if len(f) >= 4 and (f[0], f[1]) in new and f[3] == 'undecided':
            f[3] = new[(f[0], f[1])][0]; f = f[:4] + [new[(f[0], f[1])][1]]; line = '\t'.join(f) + '\n'
        out.append(line)
    open(p, 'w', encoding='utf-8').writelines(out); print('written', p)
