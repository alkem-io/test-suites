#!/usr/bin/env node
// 103-short-list-walk.mjs: register A3 remainder (2026-11-19). A sub-subspace whose MEMBER list holds only the parent
// (the top-level space is missing). Asked from the RUNNING application: does a member of the top-level space, who is
// not a member of the subspace or the sub-subspace, get the contribute rights there? Control: the same kind of user on
// a sub-subspace with a full list. Both with "inheritMembershipRights" on and subspace + sub-subspace public.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only on screen;
// ids go to <out dir>/103-detail.json (local only, no e-mail in it).
// usage: 103-short-list-walk.mjs <alkemio_db> <kratos_db> <out dir>     env: MAX_USERS (default 6), PER_USER (default 10)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 103-short-list-walk.mjs <alkemio_db> <kratos_db> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 28 }).toString().trim();
const SQL = `
SELECT CASE WHEN jsonb_array_length(r."parentCredentials")=2 THEN 'full list' WHEN r."parentCredentials"->0->>'resourceID'=s."parentSpaceId"::text THEN 'parent only' ELSE 'other' END, s.id, c."actorId", u.email
FROM space s JOIN space ps ON ps.id=s."parentSpaceId" JOIN community cm ON cm.id=s."communityId" JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='member'
JOIN credential c ON c.type::text='space-member' AND c."resourceID"=s."levelZeroSpaceID"::text JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL
WHERE s.level=2 AND s.visibility::text='active' AND (s.settings->'collaboration'->>'inheritMembershipRights')::boolean AND s.settings->'privacy'->>'mode'='public' AND ps.settings->'privacy'->>'mode'='public'
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x."resourceID" IN (s.id::text, ps.id::text) AND x.type::text LIKE 'space-%')
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text IN ('space-admin','space-lead') AND x."resourceID"=s."levelZeroSpaceID"::text)
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND (x.type::text LIKE 'platform-%' OR x.type::text LIKE 'global-admin%' OR x.type::text='global-support'))
 AND NOT EXISTS (SELECT 1 FROM credential x JOIN space z ON z.id=s."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x.type::text='account-admin' AND x."resourceID"=z."accountId"::text);`;
const pairs = { 'parent only': {}, 'full list': {} }; const email = {};
// REPLAY=<103-detail.json of an earlier walk>: ask the same (user, sub-subspace) pairs again, under the group they had then
if (process.env.REPLAY) { for (const d of JSON.parse(fs.readFileSync(process.env.REPLAY, 'utf8'))) { (pairs[d.group][d.user] ||= []).push(d.space); email[d.user] = psql(DB, `select email from "user" where id='${d.user}'`); } }
else for (const l of psql(DB, SQL).split('\n')) { const [k, sp, u, e] = l.split('\t'); if (!pairs[k]) continue; (pairs[k][u] ||= []).push(sp); email[u] = e; }
const MAX = +(process.env.MAX_USERS || 6), PER = +(process.env.PER_USER || 10);
const cnt = k => Object.values(pairs[k]).reduce((a, b) => a + b.length, 0);
console.log(`=== 103 short member list walk: database ${DB}. Candidates (plain top-level members, both levels public, inherit on): parent only ${cnt('parent only')} pairs / ${Object.keys(pairs['parent only']).length} users; full list ${cnt('full list')} pairs / ${Object.keys(pairs['full list']).length} users`);
// users: all of the short-list group first, then controls (prefer a user who is in both groups)
const order = [...Object.keys(pairs['parent only']), ...Object.keys(pairs['full list']).filter(u => !pairs['parent only'][u])].slice(0, MAX * 3);
const Q = id => `{ lookup { x: space(ID:"${id}"){ authorization{ myPrivileges } collaboration{ authorization{ myPrivileges } calloutsSet{ authorization{ myPrivileges } callouts{ id } } } } } }`;
const browser = await chromium.launch(); const detail = []; let signed = 0; const done = { 'parent only': 0, 'full list': 0 };
for (const u of order) {
  if (signed >= MAX) break;
  const todo = ['parent only', 'full list'].filter(k => pairs[k][u] && done[k] < MAX * PER / 2); if (!todo.length) continue;
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email[u].replace(/'/g, "''")}'`); if (!ident) continue;
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { await ctx.close(); continue; }
  signed++;
  for (const k of todo) for (const id of pairs[k][u].slice(0, PER)) {
    const r = await gq(Q(id)).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
    const up = a => (a?.authorization?.myPrivileges || []).map(s => s.toUpperCase()).sort();
    detail.push({ group: k, space: id, user: u, error: r.errors?.[0]?.extensions?.code || null, space_priv: up(x), collab_priv: up(x?.collaboration), set_priv: up(x?.collaboration?.calloutsSet), callouts_seen: x?.collaboration?.calloutsSet?.callouts?.length ?? null }); done[k]++; }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/103-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/103-detail.json`, 0o600);
console.log(`    users signed in: ${signed}; questions asked: ${detail.length}`);
for (const k of ['parent only', 'full list']) { const g = {}; for (const d of detail.filter(d => d.group === k)) { const key = `space [${d.space_priv}] | collaboration [${d.collab_priv}] | callouts set [${d.set_priv}]${d.error ? ' | error ' + d.error : ''}`; g[key] = (g[key] || 0) + 1; }
  console.log(`  ${k}: ${detail.filter(d => d.group === k).length} asked, ${new Set(detail.filter(d => d.group === k).map(d => d.user)).size} users`); for (const key in g) console.log(`      ${g[key]} x ${key}`); }
