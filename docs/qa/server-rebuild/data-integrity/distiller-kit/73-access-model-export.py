#!/usr/bin/env python3
"""73-access-model-export.py: what the database says every user may do, written as JSON for a cross-check
against the running application (lookup.authorizationPrivilegesForUser, role lists, memo and office reads).
The JSON holds ids: local only, delete after use.
usage: 73-access-model-export.py <db> <out.json> [focus user e-mail]"""
import subprocess, sys, json, collections
DB, OUT = sys.argv[1], sys.argv[2]; FOCUS = sys.argv[3] if len(sys.argv) > 3 else None
def psql(sql):
    r = subprocess.run(['docker', 'exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], input=sql, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-1200:])
    return [l.split('\t') for l in r.stdout.splitlines() if l]
users = [r[0] for r in psql('select id::text from "user" order by 1')]
creds = collections.defaultdict(set)
ctypes = collections.defaultdict(set)
for a, t, rid in psql("select \"actorId\"::text, type::text, coalesce(\"resourceID\",'') from credential where \"actorId\" is not null"): creds[a].add((t, rid)); ctypes[a].add(t)
up = lambda p: {'CREATE_VIRTUAL_CONTRIBUTOR': 'CREATE_VIRTUAL'}.get(p.upper().replace('-', '_'), p.upper().replace('-', '_'))   # one enum key differs from its stored value
import access_model as am   # the one shared model, checked against the server's own function by file 85
def privs(actor, cr, pr): return '+'.join(sorted(up(p) for p in am.rights_of(creds.get(actor, set()), cr, pr)))
POL = 'select p.id::text, p.type, coalesce(p."credentialRules",\'[]\')::text, coalesce(p."privilegeRules",\'[]\')::text from authorization_policy p '
out = {'users': users}
# a sample of policies of every object type, rights of ALL users on each
sample = psql(POL + "join (select id, row_number() over (partition by type order by md5(id::text)) rn from authorization_policy) s on s.id = p.id and s.rn <= 5")
out['sample'] = {}; types = collections.Counter()
for pid, ptype, cr, pr in sample:
    cr, pr = json.loads(cr), json.loads(pr); g = collections.defaultdict(list); types[ptype] += 1
    for i, u in enumerate(users): g[privs(u, cr, pr)].append(i)
    out['sample'][pid] = {'type': ptype, 'groups': g}
print('sampled policies', len(sample), 'object types', len(types))
if FOCUS:
    f = psql(f"select id::text from \"user\" where email = '{FOCUS}'")[0][0]; out['focus'] = f; out['objects'] = {}
    for kind, tbl in (('whiteboard', 'whiteboard'), ('memo', 'memo'), ('office', 'collabora_document'), ('roleset', 'role_set'), ('space', '(select s.id, a."authorizationId" from space s join actor a on a.id = s.id)'), ('callout', 'callout')):
        rows = psql(f'select x.id::text, p.id::text, coalesce(p."credentialRules",\'[]\')::text, coalesce(p."privilegeRules",\'[]\')::text from {tbl} x join authorization_policy p on p.id = x."authorizationId"')
        out['objects'][kind] = {r[0]: [r[1], privs(f, json.loads(r[2]), json.loads(r[3]))] for r in rows}
        print(kind, len(rows), 'readable by the focus user per the database:', sum(1 for v in out['objects'][kind].values() if 'READ' in v[1].split('+')))
# who holds each role of each space, from the role definitions and the credentials table
holders = collections.defaultdict(set); kind = {}
for a, k, t, rid in psql("select c.\"actorId\"::text, a.type::text, c.type::text, coalesce(c.\"resourceID\",'') from credential c join actor a on a.id = c.\"actorId\""): holders[(t, rid)].add(a); kind[a] = k
out['roles'] = {}
for sid, name, ct, rid in psql("select s.id::text, r.name, r.credential->>'type', coalesce(r.credential->>'resourceID','') from space s join community c on c.id = s.\"communityId\" join role r on r.\"roleSetId\" = c.\"roleSetId\""):
    h = holders.get((ct, rid), set())
    out['roles'].setdefault(sid, {})[name] = {'users': sorted(a for a in h if kind[a] == 'user'), 'orgs': sorted(a for a in h if kind[a] == 'organization'), 'vcs': sorted(a for a in h if kind[a] == 'virtual-contributor')}
print('spaces with role definitions', len(out['roles']))
json.dump(out, open(OUT, 'w')); print('written', OUT)
