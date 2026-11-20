#!/usr/bin/env node
// 114-community-lists-walk.mjs: do the lists of the community tab still load (2026-11-19)? Asked from the RUNNING
// application as an ADMIN OF THE SPACE (a platform admin may not list invitations everywhere): for every role set of a
// space that holds an invitee right, plus every role set with an invitation that is not in a final state, the
// invitations and applications with their state, next steps and actor, and the platform invitations: the fields a state
// flow that went wrong would break. Each list is asked on its own, so one refusal does not hide the others.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only on screen.
// Writes <out file> (ids, local only). Run before and after a repair and compare: 114-community-lists-walk.mjs --compare a b
// usage: 114-community-lists-walk.mjs <alkemio_db> <kratos_db> <out file>     env: SETS_FILE=<earlier out file> asks the same role sets as the same users
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
if (process.argv[2] === '--compare') { const [a, b] = process.argv.slice(3).map(f => JSON.parse(fs.readFileSync(f, 'utf8'))); let same = 0, diff = 0, only = 0;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!a[k] || !b[k]) only++; else if (JSON.stringify(a[k].lists) === JSON.stringify(b[k].lists)) same++; else diff++; }
  console.log(`=== 114 compare: role sets with the same answer ${same} | with a different answer ${diff} | in one file only ${only}`); process.exit(diff || only ? 1 : 0); }
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUTFILE] = process.argv.slice(2); if (!OUTFILE) { console.error('usage: 114-community-lists-walk.mjs <alkemio_db> <kratos_db> <out file>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 26 }).toString().trim();
let todo;   // [roleSet, admin user id]
if (process.env.SETS_FILE) todo = Object.entries(JSON.parse(fs.readFileSync(process.env.SETS_FILE, 'utf8'))).map(([rs, v]) => [rs, v.asked_as]);
else todo = psql(DB, `
SELECT cm."roleSetId", (SELECT c."actorId" FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL WHERE c.type='space-admin' AND c."resourceID" IN (s.id::text, s."levelZeroSpaceID"::text)
                         ORDER BY (c."resourceID"=s.id::text) DESC, md5(c."actorId"::text) LIMIT 1)
FROM space s JOIN community cm ON cm.id=s."communityId"
WHERE EXISTS (SELECT 1 FROM credential c WHERE c.type='space-invitee' AND c."resourceID"=s.id::text)
   OR EXISTS (SELECT 1 FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId" WHERE i."roleSetId"=cm."roleSetId" AND coalesce(l."machineState"::jsonb->>'value','pending') NOT IN ('accepted','archived'))`).split('\n').filter(Boolean).map(l => l.split('\t'));
const byUser = {}; let noAdmin = 0; for (const [rs, u] of todo) { if (!u) { noAdmin++; continue; } (byUser[u] ||= []).push(rs); }
const LISTS = { invitations: 'invitations{ id state nextEvents isFinalized invitedToParent extraRoles actor{ id } }', applications: 'applications{ id state nextEvents isFinalized actor{ id } }', platformInvitations: 'platformInvitations{ id }' };
const browser = await chromium.launch(); const res = {}; let noLogin = 0;
for (const u of Object.keys(byUser)) {
  const email = psql(DB, `select email from "user" where id='${u}'`);
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email.replace(/'/g, "''")}'`); if (!ident) { noLogin += byUser[u].length; continue; }
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3500);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { noLogin += byUser[u].length; await ctx.close(); continue; }
  for (const rs of byUser[u]) { const lists = {};
    for (const [k, part] of Object.entries(LISTS)) { const r = await gq(`{ lookup { roleSet(ID:"${rs}"){ ${part} } } }`).catch(e => ({ errors: [{ message: 'thrown ' + e.message }] })); const l = r.data?.lookup?.roleSet?.[k];
      lists[k] = r.errors || !l ? { error: ((r.errors?.[0]?.extensions?.code || '') + ' ' + (r.errors?.[0]?.message || 'no data')).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').slice(0, 100) }
        : l.map(i => ({ ...i, nextEvents: i.nextEvents ? [...i.nextEvents].sort() : undefined, actor: i.actor?.id })).sort((a, b) => a.id.localeCompare(b.id)); }
    res[rs] = { asked_as: u, lists }; }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(OUTFILE, JSON.stringify(res, null, 1)); fs.chmodSync(OUTFILE, 0o600);
const st = {}, err = {}; let inv = 0, app = 0;
for (const v of Object.values(res)) for (const [k, l] of Object.entries(v.lists)) { if (l.error) { err[k + ': ' + l.error] = (err[k + ': ' + l.error] || 0) + 1; continue; }
  if (k === 'invitations') inv += l.length; if (k === 'applications') app += l.length; if (k !== 'platformInvitations') for (const i of l) st[`${k} ${i.state} -> next: ${(i.nextEvents || []).join(',') || 'none'}`] = (st[`${k} ${i.state} -> next: ${(i.nextEvents || []).join(',') || 'none'}`] || 0) + 1; }
console.log(`=== 114 community lists walk: database ${DB}. Role sets: ${todo.length}, asked ${Object.keys(res).length} as ${new Set(Object.values(res).map(v => v.asked_as)).size} space admins; no admin with a login ${noAdmin}; sign-in not possible ${noLogin}`);
console.log(`    invitations listed ${inv}, applications listed ${app}`); console.log('    lists answered with an error:'); if (!Object.keys(err).length) console.log('      none'); for (const k of Object.keys(err).sort()) console.log(`      ${err[k]} x ${k}`);
console.log('    by state and next steps:'); for (const k of Object.keys(st).sort()) console.log(`      ${st[k]} x ${k}`);
