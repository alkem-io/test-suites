#!/usr/bin/env node
// 85-server-function-xcheck.mjs: is the kit's access model (access_model.py) the same as the SERVER'S OWN CODE, for every
// rule set and every holder? Loads the compiled AuthorizationService of the local server clone and calls its
// getGrantedPrivileges for every distinct rule set of the database and every holder of any kind: users, organisations,
// virtual contributors, spaces, accounts, and the two callers with no stored credential (visitor not signed in, guest).
// Then compares, rule set by rule set, with the digests written by `access_model.py --digest <db> <file>`.
// The admin query of the application takes a user id only; this check has no such limit, and it is not a sample.
// Only pruning: a holder with no credential of a type named by the rule set is not passed to the function (the function
// compares types first, so the answer for such a holder is empty by its first test).
// Read only. Counts only.   usage: 85-server-function-xcheck.mjs <db> <model digests.tsv> [server dir]
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
const [DB, MODEL, SERVER = process.env.SERVER_DIR || (process.env.HOME + '/repos/server')] = process.argv.slice(2);
const require = createRequire(SERVER + '/package.json');
const { AuthorizationService } = require(SERVER + '/dist/core/authorization/authorization.service.js');
const svc = new AuthorizationService({ verbose() { }, warn() { }, error() { }, log() { } });
let version; try { version = execFileSync('git', ['-C', SERVER, 'describe', '--tags', '--always'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { version = 'package ' + require(SERVER + '/package.json').version + ' (no git here)'; }
const psql = sql => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 4e9 }).toString().split('\n').filter(Boolean).map(l => l.split('\t'));
const md5 = s => crypto.createHash('md5').update(s).digest('hex');
const creds = new Map(), byType = new Map(), kind = new Map();
const add = (a, k, t, rid) => { if (!creds.has(a)) creds.set(a, []); creds.get(a).push({ type: t, resourceID: rid }); if (!byType.has(t)) byType.set(t, new Set()); byType.get(t).add(a); kind.set(a, k); };
for (const [a, k, t, rid] of psql('select c."actorId"::text, a.type::text, c.type::text, c."resourceID" from credential c join actor a on a.id = c."actorId"')) add(a, k, t, rid ?? '');
add('~anonymous', 'visitor not signed in', 'global-anonymous', ''); add('~guest', 'guest', 'global-guest', '');
const model = new Map(fs.readFileSync(MODEL, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t')).map(([k, d, n]) => [k, d]));
const rows = psql('select coalesce("credentialRules",\'[]\')::text, coalesce("privilegeRules",\'[]\')::text, count(*) from authorization_policy group by 1, 2');
let same = 0, differ = 0, missing = 0, calls = 0, thrown = 0, polSame = 0, polDiffer = 0; const kindsSeen = new Map(); const diffKinds = new Map();
for (const [crText, prText, cnt] of rows) {
  const key = md5(crText + '|' + prText); const credentialRules = JSON.parse(crText), privilegeRules = JSON.parse(prText);
  const cand = new Set(); let all = false;
  for (const r of credentialRules) { if (!(r.criterias || []).length) all = true; for (const c of r.criterias || []) for (const a of byType.get(c.type) || []) cand.add(a); }
  const lines = [];
  for (const a of (all ? creds.keys() : cand)) {
    calls++; let ps;
    try { ps = svc.getGrantedPrivileges(creds.get(a), { id: 'x', type: 'x', credentialRules, privilegeRules }); } catch (e) { ps = ['!THROWS']; thrown++; }
    if (ps.length) { lines.push(a + ':' + [...new Set(ps)].sort().join('+')); kindsSeen.set(kind.get(a), (kindsSeen.get(kind.get(a)) || 0) + 1); }
  }
  const d = md5(lines.sort().join('\n'));
  if (!model.has(key)) missing++; else if (model.get(key) === d) { same++; polSame += Number(cnt); } else { differ++; polDiffer += Number(cnt); const t = (credentialRules[0]?.name || '?'); diffKinds.set(t, (diffKinds.get(t) || 0) + 1); }
}
console.log(`=== 85 server function cross-check: database ${DB}, server code ${version}`);
console.log(`    holders: ${creds.size} (${[...new Set(kind.values())].map(k => `${k} ${[...kind.values()].filter(x => x === k).length}`).join(', ')})`);
console.log(`    distinct rule sets ${rows.length}; calls of the server function ${calls}; calls where the server throws ${thrown}`);
console.log(`    non-empty answers by holder kind: ${[...kindsSeen].map(([k, n]) => `${k} ${n}`).join(', ')}`);
console.log(`    rule sets where the kit model equals the server function for every holder: ${same} (${polSame} policies)`);
console.log(`    rule sets where they DIFFER: ${differ} (${polDiffer} policies)${differ ? ' first rule names: ' + JSON.stringify([...diffKinds].sort((a, b) => b[1] - a[1]).slice(0, 8)) : ''}`);
console.log(`    rule sets missing from the model file: ${missing}`);
console.log(`    VERDICT: ${differ === 0 && missing === 0 ? 'PASS' : 'FAIL'}`);
process.exit(differ === 0 && missing === 0 ? 0 : 1);
