"""access_model.py: THE ONE place where the kit computes "who may do what" from stored rows. Imported by files 72, 73,
75 and 85. Until 2026-11-17 each of them had its own copy, and the copies were wrong three times. Every rule below
names the server line it mirrors (server v0.172.0, src/core/authorization/authorization.service.ts) and is checked
against the server's own compiled function for every rule set and every holder by 85-server-function-xcheck.mjs.

  M1  a criteria matches a credential when the types are equal AND (criteria.resourceID === '' OR the two resourceIDs
      are equal).                                                      isCredentialMatch
  M2  so an EMPTY-STRING criteria resourceID is a wildcard for the type. Wrong once: matched '' exactly.
  M3  a NULL (or missing) criteria resourceID is not the wildcard and equals no stored credential, because no
      credential has a null resourceID (checked on load: stop if one exists). Wrong once: folded null into ''.
  M4  privilege rules are applied ONCE, to the rights that came from credential rules. A right that comes from a
      privilege rule does not trigger another privilege rule.       getGrantedPrivileges, isAccessGrantedForCredentials
      Wrong until 2026-11-17: the kit applied them until nothing changed.
  M5  a credential rule with NO criteria makes the server throw for every caller who holds at least one credential
      ("Credential rule without criteria"). The model reports the single right '!THROWS' for those holders: the
      object is unusable for them. (When the server checks ONE right it stops at the first rule that grants it, so a
      rule placed before the broken one can still grant; '!THROWS' is the reading of getGrantedPrivileges, which is
      what the myPrivileges field and the admin query use.)          isCredentialMatch
  M6  a policy with no credential rule at all gives nobody anything (the server refuses it before matching).
  M7  callers who are not in the credential table: a visitor who is not signed in holds (global-anonymous, ''),
      a guest holds (global-guest, '').                               actor.context.service.ts createAnonymous/createGuest
"""
import collections, hashlib, json, subprocess, sys

THROWS = '!THROWS'
PSEUDO = {'~anonymous': [('global-anonymous', '')], '~guest': [('global-guest', '')]}
PSEUDO_KIND = {'~anonymous': 'visitor not signed in', '~guest': 'guest'}

def psql(db, sql, container='alkemio_dev_postgres', user='synapse'):
    r = subprocess.run(['docker', 'exec', '-i', container, 'psql', '-U', user, '-d', db, '-X', '-q', '-At', '-F', '\t', '-v', 'ON_ERROR_STOP=1'], input=sql, capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr[-1500:])
    return [l.split('\t') for l in r.stdout.splitlines() if l]

class Holders:
    """Every credential holder of a database, plus the two callers that hold no stored credential (M7)."""
    def __init__(self, db, pseudo=True):
        self.db = db
        nulls = int(psql(db, 'select count(*) from credential where "resourceID" is null')[0][0])
        if nulls: sys.exit(f'access_model: {nulls} credentials of {db} have a NULL resourceID. Rule M3 assumes none: read the server code again before using the model.')
        self.by_key = collections.defaultdict(set); self.by_type = collections.defaultdict(set); self.kind = {}; self.creds = collections.defaultdict(set)
        for a, k, t, rid in psql(db, 'select c."actorId"::text, a.type::text, c.type::text, c."resourceID" from credential c join actor a on a.id = c."actorId"'):
            self._add(a, k, t, rid)
        if pseudo:
            for a, cs in PSEUDO.items():
                for t, rid in cs: self._add(a, PSEUDO_KIND[a], t, rid)
    def _add(self, a, k, t, rid):
        self.by_key[(t, rid)].add(a); self.by_type[t].add(a); self.kind[a] = k; self.creds[a].add((t, rid))
    def matching(self, crit):
        rid = crit.get('resourceID')
        if rid is None: return ()                                             # M3
        if rid == '': return self.by_type.get(crit.get('type'), ())           # M2
        return self.by_key.get((crit.get('type'), rid), ())                   # M1

def rights(cred_rules, priv_rules, holders):
    """{holder: set of rights} for one policy, for every holder that gets anything. cred_rules/priv_rules: parsed JSON."""
    if any(not (r.get('criterias') or []) for r in cred_rules):               # M5
        return {a: {THROWS} for a in holders.creds}
    out = collections.defaultdict(set)
    for rule in cred_rules:
        gp = rule.get('grantedPrivileges') or []
        for crit in rule.get('criterias') or []:
            for a in holders.matching(crit): out[a].update(gp)
    if priv_rules:
        for a, ps in out.items():
            first = set(ps)                                                   # M4: one pass, from the first set only
            for rule in priv_rules:
                if rule.get('sourcePrivilege') in first: ps.update(rule.get('grantedPrivileges') or [])
    return out

def rights_of(holder_creds, cred_rules, priv_rules):
    """The rights of ONE holder given as a set of (type, resourceID). Same rules, for callers that do not need all holders."""
    if not holder_creds: return set()
    if any(not (r.get('criterias') or []) for r in cred_rules): return {THROWS}
    types = {t for t, _ in holder_creds}; ps = set()
    for rule in cred_rules:
        for c in rule.get('criterias') or []:
            rid = c.get('resourceID')
            if rid is None: continue
            if (rid == '' and c.get('type') in types) or (c.get('type'), rid) in holder_creds: ps.update(rule.get('grantedPrivileges') or []); break
    first = set(ps)
    for rule in priv_rules or []:
        if rule.get('sourcePrivilege') in first: ps.update(rule.get('grantedPrivileges') or [])
    return ps

RULESETS = 'select coalesce("credentialRules",\'[]\')::text, coalesce("privilegeRules",\'[]\')::text, count(*) from authorization_policy group by 1, 2'
def ruleset_key(cr_text, pr_text): return hashlib.md5((cr_text + '|' + pr_text).encode()).hexdigest()
def digest(r):
    """One line for the outcome of a rule set: the same text the server-function check builds."""
    return hashlib.md5('\n'.join(sorted(a + ':' + '+'.join(sorted(ps)) for a, ps in r.items() if ps)).encode()).hexdigest()

def self_test():
    """Seeded cases: each of the three past mistakes must turn this red if it comes back."""
    class H(Holders):
        def __init__(self):
            self.by_key = collections.defaultdict(set); self.by_type = collections.defaultdict(set); self.kind = {}; self.creds = collections.defaultdict(set)
            self._add('u1', 'user', 'space-member', 'S1'); self._add('u2', 'user', 'space-member', 'S2'); self._add('u3', 'user', 'global-registered', '')
    h = H(); fail = []
    def want(name, got, exp):
        if {k: set(v) for k, v in got.items() if v} != exp: fail.append(f'{name}: got {dict(got)} expected {exp}')
    want('M1 equal id', rights([{'criterias': [{'type': 'space-member', 'resourceID': 'S1'}], 'grantedPrivileges': ['read']}], [], h), {'u1': {'read'}})
    want('M2 empty string is any of the type', rights([{'criterias': [{'type': 'space-member', 'resourceID': ''}], 'grantedPrivileges': ['read']}], [], h), {'u1': {'read'}, 'u2': {'read'}})
    want('M3 null is nobody', rights([{'criterias': [{'type': 'space-member', 'resourceID': None}], 'grantedPrivileges': ['read']}], [], h), {})
    want('M3 missing key is nobody', rights([{'criterias': [{'type': 'space-member'}], 'grantedPrivileges': ['read']}], [], h), {})
    want('M4 one pass', rights([{'criterias': [{'type': 'space-member', 'resourceID': 'S1'}], 'grantedPrivileges': ['a']}],
                              [{'sourcePrivilege': 'a', 'grantedPrivileges': ['b']}, {'sourcePrivilege': 'b', 'grantedPrivileges': ['c']}], h), {'u1': {'a', 'b'}})
    want('M4 one pass, rule order does not matter', rights([{'criterias': [{'type': 'space-member', 'resourceID': 'S1'}], 'grantedPrivileges': ['a']}],
                              [{'sourcePrivilege': 'b', 'grantedPrivileges': ['c']}, {'sourcePrivilege': 'a', 'grantedPrivileges': ['b']}], h), {'u1': {'a', 'b'}})
    want('M5 empty criteria throws for every holder', rights([{'criterias': [], 'grantedPrivileges': ['read']}, {'criterias': [{'type': 'space-member', 'resourceID': 'S1'}], 'grantedPrivileges': ['read']}], [], h),
         {'u1': {THROWS}, 'u2': {THROWS}, 'u3': {THROWS}})
    want('M6 no rule', rights([], [{'sourcePrivilege': 'a', 'grantedPrivileges': ['b']}], h), {})
    for a in ('u1', 'u2', 'u3'):
        cr = [{'criterias': [{'type': 'space-member', 'resourceID': ''}, {'type': 'global-registered', 'resourceID': None}], 'grantedPrivileges': ['a']}]; pr = [{'sourcePrivilege': 'a', 'grantedPrivileges': ['b']}, {'sourcePrivilege': 'b', 'grantedPrivileges': ['c']}]
        if rights_of(h.creds[a], cr, pr) != rights(cr, pr, h).get(a, set()): fail.append(f'rights_of differs from rights for {a}')
    return fail

if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == '--self-test':
        f = self_test(); print('access_model self-test:', 'PASS' if not f else 'FAIL'); [print('   ', x) for x in f]; sys.exit(1 if f else 0)
    if len(sys.argv) == 4 and sys.argv[1] == '--digest':
        # one line per distinct rule set of the database: key <TAB> digest of every holder's rights (for file 85)
        db, out = sys.argv[2], sys.argv[3]; h = Holders(db); n = 0
        with open(out, 'w') as f:
            for cr, pr, cnt in psql(db, RULESETS):
                f.write(ruleset_key(cr, pr) + '\t' + digest(rights(json.loads(cr), json.loads(pr), h)) + '\t' + cnt + '\n'); n += 1
        print(f'access_model: {n} distinct rule sets of {db}, {len(h.creds)} holders, written {out}'); sys.exit(0)
    sys.exit('usage: access_model.py --self-test | --digest <db> <out.tsv>')
