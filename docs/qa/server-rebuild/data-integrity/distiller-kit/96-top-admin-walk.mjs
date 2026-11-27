#!/usr/bin/env node
// 96-top-admin-walk.mjs: the rule of the QA lead (2026-11-19): "the admin of a top-level space is admin of every
// subspace and sub-subspace below, and need not be a member of them". Asked from the RUNNING application.
// For every subspace it looks for a clean witness: a user who is admin of the top-level space, has a login, holds
// NO role of his own on the subspace, is not admin of the space in between, holds no platform role and is not admin
// of the account. It signs in as the witness (one-time recovery link of the LOCAL login service) and asks the
// application for myPrivileges on the subspace. Admin = update, delete and grant together.
// Subspaces are grouped by what the database says: entries in the admin list, top-level admin in the list,
// top-level admin named by a rule of the stored space policy.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Prints counts only;
// ids go to <out dir>/96-detail.json (local only, no e-mail in it).
// usage: 96-top-admin-walk.mjs <alkemio_db> <kratos_db> <out dir>      env: MAX_USERS (default 15), PER_USER (default 60)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 96-top-admin-walk.mjs <alkemio_db> <kratos_db> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!(/^http:\/\/localhost(:\d+)?$/.test(BASE) || (process.env.STACK_BASE === BASE && !/alkem\.io/i.test(BASE)))) { console.error('local stack or a declared distiller stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 28 }).toString().trim();
const SQL = `
CREATE TEMP TABLE sp AS
 SELECT s.id, s.level, s."parentSpaceId" p, s."levelZeroSpaceID" l0, jsonb_array_length(r."parentCredentials") n,
   EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") e WHERE e->>'type'='space-admin' AND e->>'resourceID'=s."levelZeroSpaceID"::text) in_list,
   EXISTS (SELECT 1 FROM authorization_policy pl CROSS JOIN LATERAL jsonb_array_elements(pl."credentialRules"::jsonb) ru CROSS JOIN LATERAL jsonb_array_elements(ru->'criterias') c
            WHERE pl.id=a."authorizationId" AND c->>'type'='space-admin' AND c->>'resourceID'=s."levelZeroSpaceID"::text
              AND ru->'grantedPrivileges' ? 'update' AND ru->'grantedPrivileges' ? 'delete' AND ru->'grantedPrivileges' ? 'grant') in_policy
 FROM space s JOIN actor a ON a.id=s.id JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='admin' WHERE s.level>0;
SELECT 'S', sp.id, sp.level, sp.n, sp.in_list, sp.in_policy FROM sp;
SELECT 'C', sp.id, c."actorId", us.email
  FROM sp JOIN credential c ON c.type::text='space-admin' AND c."resourceID"=sp.l0::text JOIN "user" us ON us.id=c."actorId" AND us."authenticationID" IS NOT NULL
  JOIN space z ON z.id=sp.l0
 WHERE NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text IN ('space-admin','space-subspace-admin','space-lead','space-member') AND x."resourceID"=sp.id::text)
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text IN ('space-admin','space-subspace-admin') AND x."resourceID"=sp.p::text AND sp.p<>sp.l0)
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text LIKE 'platform-%')
   AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text='account-admin' AND x."resourceID"=z."accountId"::text);`;
const spaces = {}; const cand = {}; const email = {};
for (const l of psql(DB, SQL).split('\n')) { const f = l.split('\t');
  if (f[0] === 'S') spaces[f[1]] = { level: +f[2], n: +f[3], inList: f[4] === 't', inPolicy: f[5] === 't' };
  if (f[0] === 'C') { (cand[f[2]] ||= []).push(f[1]); email[f[2]] = f[3]; } }
const grp = id => { const s = spaces[id]; return `level ${s.level} | list entries ${s.n} | top admin in list ${s.inList ? 'yes' : 'no'} | named by stored policy ${s.inPolicy ? 'yes' : 'no'}`; };
const total = {}; for (const id in spaces) total[grp(id)] = (total[grp(id)] || 0) + 1;
// pick users: first the ones that cover most subspaces where the list or the stored policy does not name the top admin
const MAX = +(process.env.MAX_USERS || 15), PER = +(process.env.PER_USER || 60);
const need = new Set(Object.keys(spaces).filter(id => !spaces[id].inPolicy || !spaces[id].inList)); const chosen = []; const users = Object.keys(cand);
const hasLogin = u => psql(KDB, `select count(*) from identities where traits->>'email' = '${email[u].replace(/'/g, "''")}'`) === '1';
while (chosen.length < MAX) { let best = null, bn = 0;
  for (const u of users) { if (chosen.includes(u)) continue; const n = cand[u].filter(id => need.has(id)).length; if (n > bn) { bn = n; best = u; } }
  if (!best) break; if (!hasLogin(best)) { users.splice(users.indexOf(best), 1); continue; }
  chosen.push(best); cand[best].forEach(id => need.delete(id)); }
console.log(`=== 96 top-level admin rule, asked from the application: database ${DB}, ${Object.keys(spaces).length} subspaces, witnesses available ${Object.keys(cand).length}, signed in ${chosen.length}`);
const res = {}; const detail = []; const browser = await chromium.launch(); let signed = 0;
for (const u of chosen) {
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email[u].replace(/'/g, "''")}'`);
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { console.log('    a witness could not be signed in: skipped'); await ctx.close(); continue; }
  signed++;
  // the not-met groups first, then a share of the sound ones as control
  const ids = cand[u].sort((a, b) => (spaces[a].inPolicy + spaces[a].inList) - (spaces[b].inPolicy + spaces[b].inList)).slice(0, PER);
  for (const id of ids) {
    const r = await gq(`{ lookup { x: space(ID:"${id}"){ authorization{ myPrivileges } } } }`).catch(() => ({ errors: [{ message: 'thrown' }] }));
    const p = r.data?.lookup?.x?.authorization?.myPrivileges; const up = (p || []).map(x => x.toUpperCase());
    const out = !p ? `refused (${r.errors?.[0]?.extensions?.code || 'ERR'})` : ['UPDATE', 'DELETE', 'GRANT'].every(x => up.includes(x)) ? 'ADMIN' : up.includes('READ') ? 'read, not admin' : up.length ? 'less than read' : 'no privilege';
    const g = grp(id); (res[g] ||= {}); res[g][out] = (res[g][out] || 0) + 1; (res[g].__s ||= new Set()).add(id);
    detail.push({ space: id, user: u, group: g, outcome: out, privileges: up }); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/96-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/96-detail.json`, 0o600);
console.log(`    witnesses signed in: ${signed}; questions asked: ${detail.length}`);
for (const g of Object.keys(total).sort()) { const r = res[g] || {}; const n = r.__s ? r.__s.size : 0; delete r.__s;
  console.log(`    ${g} | subspaces ${total[g]} | asked on ${n} | answers ${JSON.stringify(r)}`); }
// a subspace is settled by its worst answer
const worst = {}; for (const d of detail) { const w = worst[d.space]; if (!w || (w === 'ADMIN' && d.outcome !== 'ADMIN')) worst[d.space] = d.outcome; }
const bad = Object.values(worst).filter(o => o !== 'ADMIN').length;
console.log(`    subspaces asked ${Object.keys(worst).length}: the top-level admin is admin on ${Object.keys(worst).length - bad}, NOT admin on ${bad}`);
console.log(bad ? 'VERDICT: the rule is NOT met in the application on the subspaces counted above' : 'VERDICT: the rule holds on every subspace asked');
