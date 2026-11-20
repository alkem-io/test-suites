#!/usr/bin/env python3
"""72-access-equivalence.py: for EVERY credential holder, is access on the new database the same as on the source?
Access on the legacy server = the credentials an actor holds x the rules stored on each object's policy
(authorization_policy.credentialRules: whoever holds credential (type, resourceID) gets grantedPrivileges;
privilegeRules: whoever has sourcePrivilege also gets grantedPrivileges). Both are plain rows, so the full
answer can be computed for all holders at once. Read only. Counts only, never an id.

Part A  the copy.  Policies and credentials that were copied are byte-identical to the source (file 71), so a
        holder can only LOSE access, and only through a rejected credential. For every rejected credential:
        does the holder still hold the same right through another credential, and does any KEPT policy grant
        anything to it?  Expect: 0 rights lost on kept objects.
Part B  later changes (authorization reset, repairs).  Compares the rules of every kept policy between the
        source and the new database as it is now, and for every policy that changed computes the rights of
        every holder before and after.  Reports rights gained and lost, by holder kind, privilege and object type.

usage: 72-access-equivalence.py <source_db> <new_db> <label>     (label: runs/<label>/69-reject-list.csv)
"""
import subprocess, sys, os, csv, io, json, collections
SRC, NEW, LABEL = sys.argv[1:4]
C = os.environ.get('DOCKER', 'alkemio_dev_postgres'); U = os.environ.get('PGUSER_', 'synapse')
here = os.path.dirname(os.path.abspath(__file__))
def psql(db, sql):
    r = subprocess.run(['docker', 'exec', '-i', C, 'psql', '-U', U, '-d', db, '-X', '-q', '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], input=sql, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-1500:])
    return [l.split('\t') for l in r.stdout.splitlines() if l]
rej = collections.defaultdict(set)
for t, i, ru, rd in csv.reader(open(os.path.join(here, 'runs', LABEL, '69-reject-list.csv'))): rej[t].add(i)
print(f'=== 72 access equivalence: source {SRC}, new {NEW}')

# ---------------- Part A
copy_ids = lambda name, ids: f"CREATE TEMP TABLE {name}(id text PRIMARY KEY);\nCOPY {name} FROM STDIN;\n" + '\n'.join(sorted(ids)) + "\n\\.\n"
a = psql(SRC, copy_ids('rc', rej['credential']) + copy_ids('rp', rej['authorization_policy']) + r"""
CREATE TEMP TABLE lost AS SELECT c.id, c."actorId" AS actor, c.type::text AS ctype, coalesce(c."resourceID",'') AS rid FROM credential c JOIN rc ON rc.id = c.id::text;
CREATE TEMP TABLE la AS SELECT DISTINCT actor FROM lost WHERE actor IS NOT NULL;
-- every rule of every KEPT policy that a rejected credential matches. The server matches a rule with an empty
-- resourceID against ANY credential of that type (authorization.service.ts: criteria.resourceID === ''), so '' is a
-- wildcard here too. A NULL resourceID is neither: the strict test fails and it equals no credential, so such a rule matches nobody.
CREATE TEMP TABLE g AS
SELECT p.id AS pid, p.type AS ptype, crit->>'type' AS ctype, crit->>'resourceID' AS rid, priv
  FROM authorization_policy p, jsonb_array_elements(p."credentialRules") r, jsonb_array_elements(r->'criterias') crit, jsonb_array_elements_text(r->'grantedPrivileges') priv
 WHERE NOT EXISTS (SELECT 1 FROM rp WHERE rp.id = p.id::text) AND crit->>'resourceID' IS NOT NULL
   AND p.id IN (SELECT p2.id FROM authorization_policy p2, jsonb_array_elements(p2."credentialRules") r2, jsonb_array_elements(r2->'criterias') c2
                 WHERE EXISTS (SELECT 1 FROM lost l WHERE l.actor IS NOT NULL AND l.ctype = c2->>'type' AND (c2->>'resourceID' = '' OR l.rid = c2->>'resourceID')));
CREATE TEMP TABLE bef AS SELECT DISTINCT c."actorId" AS actor, g.pid, g.ptype, g.priv FROM g JOIN credential c ON c.type::text = g.ctype AND (g.rid = '' OR coalesce(c."resourceID",'') = g.rid) WHERE c."actorId" IN (SELECT actor FROM la);
CREATE TEMP TABLE aft AS SELECT DISTINCT c."actorId" AS actor, g.pid, g.priv FROM g JOIN credential c ON c.type::text = g.ctype AND (g.rid = '' OR coalesce(c."resourceID",'') = g.rid)
 WHERE c."actorId" IN (SELECT actor FROM la) AND NOT EXISTS (SELECT 1 FROM rc WHERE rc.id = c.id::text);
SELECT 'T', (SELECT count(*) FROM lost), (SELECT count(*) FROM lost WHERE actor IS NULL), (SELECT count(*) FROM la), (SELECT count(DISTINCT pid) FROM g), (SELECT count(*) FROM bef), (SELECT count(*) FROM aft);
SELECT 'L', b.ptype, b.priv, coalesce(ac.type::text,'?'), count(*), count(DISTINCT b.actor), count(DISTINCT b.pid)
  FROM bef b LEFT JOIN aft a ON a.actor = b.actor AND a.pid = b.pid AND a.priv = b.priv LEFT JOIN actor ac ON ac.id = b.actor WHERE a.actor IS NULL GROUP BY 2, 3, 4 ORDER BY 5 DESC;
SELECT 'W', l.ctype, count(DISTINCT l.actor), count(DISTINCT l.actor) FILTER (WHERE NOT EXISTS (SELECT 1 FROM credential k WHERE k."actorId" = l.actor AND k.type::text = l.ctype AND NOT EXISTS (SELECT 1 FROM rc WHERE rc.id = k.id::text)))
  FROM lost l WHERE l.actor IS NOT NULL GROUP BY 2 ORDER BY 2;
""")
T = next(r for r in a if r[0] == 'T')
print(f'--- A. rejected credentials: {T[1]}; with no holder {T[2]}; holders of the rest: {T[3]}; kept policies with a rule one of them matches: {T[4]}')
print(f'    rights those holders have on these policies: before the copy {T[5]}, after the copy {T[6]}')
L = [r for r in a if r[0] == 'L']
print(f'    A VERDICT: rights lost on kept objects = {sum(int(r[4]) for r in L)} (object type | right | holder kind | rights | holders | policies):')
for r in L: print(f'      {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} | {r[6]}')
print('    holders who lose their LAST credential of a type (credential type | holders with a rejected one | of them left with none of that type):')
for r in a:
    if r[0] == 'W': print(f'      {r[1]} | {r[2]} | {r[3]}')

# ---------------- Part B
fp = "select id::text, md5(coalesce(\"credentialRules\"::text,'') || '|' || coalesce(\"privilegeRules\"::text,'')) from authorization_policy"
b0 = dict(psql(SRC, fp)); b1 = dict(psql(NEW, fp))
kept = set(b0) - rej['authorization_policy']
changed = sorted(i for i in b1 if i in b0 and b0[i] != b1[i])
print(f'--- B. policies: source {len(b0)}, kept by the copy {len(kept)}, in the new database {len(b1)}; only in the new database {len(set(b1) - set(b0))}; missing from the new database {len(kept - set(b1))}; rules differ now {len(changed)}')
if changed:
    exp = copy_ids('ch', changed) + r'''SELECT p.id::text, p.type, coalesce(p."credentialRules",'[]')::text, coalesce(p."privilegeRules",'[]')::text FROM authorization_policy p JOIN ch ON ch.id = p.id::text;'''
    before = {r[0]: r for r in psql(SRC, exp)}; after = {r[0]: r for r in psql(NEW, exp)}
    import access_model as am   # the one shared model, checked against the server's own function by file 85
    HN = am.Holders(NEW); kind = HN.kind
    def rights(row): return am.rights(json.loads(row[2]), json.loads(row[3]), HN)
    gained = collections.Counter(); lost = collections.Counter(); ga = collections.defaultdict(set); la = collections.defaultdict(set); samep = 0
    rulechg = collections.Counter()
    for pid in changed:
        rb, ra = rights(before[pid]), rights(after[pid]); any_ = False
        for actor in set(rb) | set(ra):
            for p in ra.get(actor, set()) - rb.get(actor, set()): gained[(after[pid][1], p, kind.get(actor))] += 1; ga[kind.get(actor)].add(actor); any_ = True
            for p in rb.get(actor, set()) - ra.get(actor, set()): lost[(after[pid][1], p, kind.get(actor))] += 1; la[kind.get(actor)].add(actor); any_ = True
        samep += not any_
        kb = {(c.get('type'), r_.get('name')) for r_ in json.loads(before[pid][2]) for c in r_.get('criterias') or []}
        ka = {(c.get('type'), r_.get('name')) for r_ in json.loads(after[pid][2]) for c in r_.get('criterias') or []}
        for x in ka - kb: rulechg[('rule added', after[pid][1], x[1], x[0])] += 1
        for x in kb - ka: rulechg[('rule removed', after[pid][1], x[1], x[0])] += 1
    print(f'    of the {len(changed)} changed policies, {samep} give every holder the same rights as before (the rule text changed, the outcome did not)')
    print(f'    rights GAINED: {sum(gained.values())} (holders: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(ga.items(), key=str)) + ')')
    for (pt, p, k), n in sorted(gained.items(), key=lambda x: -x[1])[:25]: print(f'      + {pt} | {p} | {k} | {n}')
    print(f'    rights LOST: {sum(lost.values())} (holders: ' + ', '.join(f'{k} {len(v)}' for k, v in sorted(la.items(), key=str)) + ')')
    for (pt, p, k), n in sorted(lost.items(), key=lambda x: -x[1])[:25]: print(f'      - {pt} | {p} | {k} | {n}')
    print('    what changed in the rule text (kind | object type | rule name | credential type | policies):')
    for (w, pt, name, ct), n in sorted(rulechg.items(), key=lambda x: -x[1])[:30]: print(f'      {w} | {pt} | {name} | {ct} | {n}')
cb = {tuple(r) for r in psql(SRC, "select id::text, coalesce(\"actorId\"::text,''), type::text, coalesce(\"resourceID\",'') from credential")}
cn = {tuple(r) for r in psql(NEW, "select id::text, coalesce(\"actorId\"::text,''), type::text, coalesce(\"resourceID\",'') from credential")}
keptc = {r for r in cb if r[0] not in rej['credential']}
print(f'--- credentials: source {len(cb)}, kept by the copy {len(keptc)}, in the new database now {len(cn)}; added since the copy {len(cn - keptc)}; removed since the copy {len(keptc - cn)}')
print('=== 72 done')
