#!/usr/bin/env python3
"""75-access-full-compare.py: the rights of EVERY credential holder on EVERY policy, source against a later state
(after copy, repairs and resets), taking both the rules and the credentials of each side.
Unlike 72 part B this also sees changes that come from credentials (added, moved, removed), not only from rules.
Matching as the server does it (authorization.service.ts): criteria.resourceID '' = any credential of that type,
null = nobody, otherwise equal; privilege rules applied once; a rule with no criteria = the server throws
(shown as the right !THROWS). The model is access_model.py. Holders include the visitor who is not signed in and the guest. Read only, counts only.
usage: 75-access-full-compare.py <source_db> <new_db>"""
import subprocess, sys, json, collections
SRC, NEW = sys.argv[1:3]
def psql(db, sql):
    r = subprocess.run(['docker', 'exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], input=sql, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-1200:])
    return [l.split('\t') for l in r.stdout.splitlines() if l]
import access_model as am   # the one shared model, checked against the server's own function by file 85
H0, H1 = am.Holders(SRC), am.Holders(NEW)
h0, bt0, k0 = H0.by_key, H0.by_type, H0.kind; h1, bt1, k1 = H1.by_key, H1.by_type, H1.kind; kind = dict(k0); kind.update(k1)
chg_keys = {k for k in set(h0) | set(h1) if h0.get(k, set()) != h1.get(k, set())}
chg_types = {t for t in set(bt0) | set(bt1) if bt0.get(t, set()) != bt1.get(t, set())}
print(f'=== 75 full access compare: source {SRC}, new {NEW}')
print(f'--- credential keys (type, target): source {len(h0)}, new {len(h1)}; keys whose holders differ {len(chg_keys)}; types whose holder set differs {len(chg_types)} {sorted(chg_types)}')
POL = 'select id::text, type, coalesce("credentialRules",\'[]\')::text, coalesce("privilegeRules",\'[]\')::text from authorization_policy'
new = {r[0]: r for r in psql(NEW, POL)}
src = {r[0]: r for r in psql(SRC, POL) if r[0] in new}
print(f'--- policies in the new database {len(new)}; of them present in the source {len(src)}; new since the copy {len(new) - len(src)}')
def rights(row, H): return am.rights(json.loads(row[2]), json.loads(row[3]), H)
def touches(row):
    for rule in json.loads(row[2]):
        if not (rule.get('criterias') or []): return True     # the server throws for every holder: always examine
        for c in rule.get('criterias') or []:
            rid = c.get('resourceID')
            if rid is None: continue
            if (rid == '' and c.get('type') in chg_types) or (rid != '' and (c.get('type'), rid) in chg_keys): return True
    return False
same_text = examined = changed_pol = 0; thr = collections.Counter()
gained = collections.Counter(); lost = collections.Counter(); ga = collections.defaultdict(set); la = collections.defaultdict(set); polg = collections.Counter(); poll = collections.Counter()
for pid, n in new.items():
    s = src.get(pid)
    if s is None: continue
    if s[2] == n[2] and s[3] == n[3]:
        same_text += 1
        if not touches(n): continue
    examined += 1
    rb, ra = rights(s, H0), rights(n, H1); any_ = False
    tb = any(am.THROWS in v for v in rb.values()); ta = any(am.THROWS in v for v in ra.values())
    if tb or ta:   # the server throws for every caller on this policy: not a right of anybody, counted on its own line
        thr[(n[1], 'throws before and after' if tb and ta else 'throws only before' if tb else 'throws only AFTER')] += 1
        if tb and ta: continue
        rb = {} if tb else rb; ra = {} if ta else ra
    for a in set(rb) | set(ra):
        g = ra.get(a, set()) - rb.get(a, set()); l = rb.get(a, set()) - ra.get(a, set())
        for p in g: gained[(n[1], p, kind.get(a))] += 1; ga[kind.get(a)].add(a); any_ = True
        for p in l: lost[(n[1], p, kind.get(a))] += 1; la[kind.get(a)].add(a); any_ = True
    if any_: changed_pol += 1; polg[n[1]] += 1
print(f'--- policies with the same rule text {same_text}; examined in full (text differs or a credential they name changed) {examined}; policies where some holder gains or loses a right: {changed_pol}')
print('    policies with a changed outcome, by object type:', dict(polg.most_common()))
print(f'    rights GAINED: {sum(gained.values())} (holders: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(ga.items(), key=str)) + ')')
agg = collections.Counter()
for (pt, p, k), c in gained.items(): agg[(pt, k)] += c
for (pt, k), c in agg.most_common(25): print(f'      + {pt} | {k} | {c} | ' + '+'.join(sorted({p for (pt2, p, k2) in gained if pt2 == pt and k2 == k}))[:110])
print(f'    rights LOST: {sum(lost.values())} (holders: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(la.items(), key=str)) + ')')
agg = collections.Counter()
for (pt, p, k), c in lost.items(): agg[(pt, k)] += c
for (pt, k), c in agg.most_common(25): print(f'      - {pt} | {k} | {c} | ' + '+'.join(sorted({p for (pt2, p, k2) in lost if pt2 == pt and k2 == k}))[:110])
print('--- policies with a rule that has no criteria (the server throws for every caller; object type, state: policies):', dict(thr) or 'none')
print('=== 75 done')
