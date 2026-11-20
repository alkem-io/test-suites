#!/usr/bin/env node
// 102-left-member-walk.mjs: after the membership repair (99) and a reset, does the RUNNING application still work
// for the users who lost roles? Asked by the QA lead, 2026-11-19: "will there be wrong activity logs and in-app
// notifications which could cause errors".
// Input: the role credentials as they were BEFORE the repair (a file: actor <tab> type <tab> space id), written by
//   psql -Atc "COPY (select "actorId", type, "resourceID" from credential where type in ('space-member','space-lead','space-admin')) TO STDOUT"
// A "lost pair" is a user and a space where the user held a role before and holds none now.
// For each chosen user (most lost pairs with activity first) it signs in (one-time recovery link of the LOCAL login
// service) and checks:
//   W1 the home page loads: every GraphQL answer the page gets is counted, answers that carry errors are listed by code
//   W2 the memberships of the user do not list a lost space
//   W3 the activity feed answers without error (all, and "my activity"); entries on lost spaces are counted by access
//   W4 the notifications answer without error
//   W5 each lost space asked directly: privileges, by privacy mode. Private: no READ expected. No answer may be a server error
//   W6 the activity log of a lost space the user can still read answers, and still shows the user's own old records
//   W7 the page of one lost space opens without a GraphQL error other than a refusal on a private space
// Reads only (the sign-in writes a session into the local login database). Local stack only. Prints counts only; ids
// go to <out dir>/102-detail.json (local only, no e-mail in it).
// usage: 102-left-member-walk.mjs <alkemio_db> <kratos_db> <before.tsv> <out dir>      env: MAX_USERS (default 3)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, BEFORE, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 102-left-member-walk.mjs <alkemio_db> <kratos_db> <before.tsv> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!(/^http:\/\/localhost(:\d+)?$/.test(BASE) || (process.env.STACK_BASE === BASE && !/alkem\.io/i.test(BASE)))) { console.error('local stack or a declared distiller stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 28 }).toString().trim();
const rows = sql => { const o = psql(DB, sql); return o ? o.split('\n').map(l => l.split('\t')) : []; };
const SQL = `CREATE TEMP TABLE b(actor uuid, typ text, sid text); COPY b FROM STDIN;
${fs.readFileSync(BEFORE, 'utf8').trim()}
\\.
CREATE TEMP TABLE lost AS SELECT DISTINCT b.actor, b.sid::uuid sid FROM b JOIN "user" u ON u.id=b.actor JOIN space s ON s.id::text=b.sid
 WHERE NOT EXISTS (SELECT 1 FROM credential c WHERE c."actorId"=b.actor AND c."resourceID"=b.sid AND c.type::text IN ('space-member','space-lead','space-admin'));
SELECT l.actor, l.sid, s.settings->'privacy'->>'mode', s."collaborationId", u.email,
       (SELECT count(*) FROM activity a WHERE a."triggeredBy"=l.actor AND a."collaborationID"=s."collaborationId"),
       (SELECT count(*) FROM credential c WHERE c."actorId"=l.actor AND (c.type::text LIKE 'platform-%' OR c.type::text IN ('global-admin','global-support')))
  FROM lost l JOIN space s ON s.id=l.sid JOIN "user" u ON u.id=l.actor WHERE u."authenticationID" IS NOT NULL;`;
const lost = {}; const email = {}; const plat = {};
for (const f of rows(SQL)) { (lost[f[0]] ||= []).push({ sid: f[1], mode: f[2], collab: f[3], acts: +f[5] }); email[f[0]] = f[4]; plat[f[0]] = +f[6]; }
const all = Object.keys(lost); const MAX = +(process.env.MAX_USERS || 3);
const score = u => lost[u].reduce((n, p) => n + (p.acts ? 1000 : 0) + p.acts, 0) + lost[u].length;
const hasLogin = u => psql(KDB, `select count(*) from identities where traits->>'email' = '${email[u].replace(/'/g, "''")}'`) === '1';
// users without a platform role first: a platform role reads everything, so it proves little
const chosen = all.sort((a, b) => (plat[a] ? 1 : 0) - (plat[b] ? 1 : 0) || score(b) - score(a)).filter(hasLogin).slice(0, MAX);
const reads = o => o === 'read' || o === 'still more than read';
console.log(`=== 102 users who lost roles, asked from the application: database ${DB}; users with a lost pair and a login ${all.length}, lost pairs ${all.reduce((n, u) => n + lost[u].length, 0)}, walked ${chosen.length}`);
const T = {}; const add = (k, n = 1) => { T[k] = (T[k] || 0) + n; }; const detail = []; const browser = await chromium.launch();
const errCodes = r => (r?.errors || []).map(e => e.extensions?.code || 'NO_CODE');
for (const u of chosen) {
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email[u].replace(/'/g, "''")}'`);
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  let net = []; let consoleErr = 0;
  page.on('console', m => { if (m.type() === 'error') consoleErr++; });
  page.on('response', async r => { if (!/\/graphql/.test(r.url())) return; let j = null; try { j = await r.json(); } catch { }
    let op = '?'; try { op = JSON.parse(r.request().postData() || '{}').operationName || '?'; } catch { }
    net.push({ op, status: r.status(), codes: errCodes(j) }); });
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  // W1 home page
  net = []; consoleErr = 0;
  await page.goto(BASE + '/home', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(9000);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { console.log('    a user could not be signed in: skipped'); await ctx.close(); continue; }
  add('users walked'); const PR = plat[u] ? 'platform role' : 'plain user'; add(`users walked: ${PR}`);
  const home = net.slice(); const homeBad = home.filter(n => n.codes.length || n.status >= 400);
  add('W1 home page: GraphQL answers', home.length); add('W1 home page: answers with an error', homeBad.length);
  for (const n of homeBad) add(`W1 home page error: ${n.op} ${n.codes.join(',') || n.status}`);
  const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
  add('W1 home page: rendered with content', bodyText.length > 200 ? 1 : 0); add('W1 home page: shows an error text', /something went wrong|unexpected error|error occurred/i.test(bodyText) ? 1 : 0);
  await page.screenshot({ path: `${OUT}/102-home-${chosen.indexOf(u) + 1}.png` }).catch(() => { });
  const L = lost[u]; const lostIds = new Set(L.map(p => p.sid));
  // W2 memberships
  const m = await gq('{ me { spaceMembershipsFlat { space { id } } } }');
  add('W2 memberships: answers with an error', errCodes(m).length ? 1 : 0);
  add('W2 memberships: lost spaces still listed', (m.data?.me?.spaceMembershipsFlat || []).filter(x => lostIds.has(x.space.id)).length);
  // W5 each lost space
  const can = {};
  for (const p of L) {
    const r = await gq(`{ lookup { x: space(ID:"${p.sid}"){ authorization{ myPrivileges } about { profile { url } } } } }`).catch(() => ({ errors: [{ extensions: { code: 'THROWN' } }] }));
    const pr = (r.data?.lookup?.x?.authorization?.myPrivileges || []).map(x => x.toUpperCase()); const codes = errCodes(r);
    const out = pr.includes('UPDATE') || pr.includes('GRANT') ? 'still more than read' : pr.includes('READ') ? 'read' : pr.includes('READ_ABOUT') ? 'about only' : codes.length ? `refused (${codes[0]})` : 'no privilege';
    can[p.sid] = { out, url: r.data?.lookup?.x?.about?.profile?.url }; add(`W5 lost space, ${PR}, ${p.mode}: ${out}`);
    if (codes.some(c => /INTERNAL|THROWN|NO_CODE/.test(c))) add('W5 lost space: SERVER ERROR');
    detail.push({ user: u, space: p.sid, mode: p.mode, outcome: out, privileges: pr, own_activity_rows: p.acts }); }
  // W3 activity feed
  for (const [name, args] of [['all', ''], ['my activity', 'args:{myActivity:true}, ']]) {
    const f = await gq(`{ activityFeed(${args}first: 100) { total activityFeed { id type collaborationID triggeredBy { id } space { id } } } }`);
    const es = f.data?.activityFeed?.activityFeed || []; const onLost = es.filter(e => e.space && lostIds.has(e.space.id));
    add(`W3 feed (${name}): answers with an error`, errCodes(f).length ? 1 : 0); for (const c of errCodes(f)) add(`W3 feed (${name}) error: ${c}`);
    add(`W3 feed (${name}): entries returned`, es.length);
    add(`W3 feed (${name}): entries on a lost space the user can still read`, onLost.filter(e => reads(can[e.space.id]?.out)).length);
    add(`W3 feed (${name}): entries on a lost space the user can NOT read (expect 0)`, onLost.filter(e => !reads(can[e.space.id]?.out)).length); }
  // W4 notifications
  const n = await gq('{ me { notificationsUnreadCount notifications(first: 50) { total inAppNotifications { id type state } } } }');
  add('W4 notifications: answers with an error', errCodes(n).length ? 1 : 0); for (const c of errCodes(n)) add(`W4 notifications error: ${c}`);
  add('W4 notifications: returned', (n.data?.me?.notifications?.inAppNotifications || []).length);
  // W6 the activity log of lost spaces
  for (const p of L.filter(p => p.acts).slice(0, 6)) {
    const a = await gq(`{ activityLogOnCollaboration(queryData:{collaborationID:"${p.collab}", limit: 500}) { id type triggeredBy { id } } }`); const codes = errCodes(a);
    const mine = (a.data?.activityLogOnCollaboration || []).filter(e => e.triggeredBy?.id === u).length;
    const k = reads(can[p.sid].out) ? 'readable' : 'not readable';
    add(`W6 activity log of a lost space, ${k}: asked`); add(`W6 activity log of a lost space, ${k}: answers with an error`, codes.length ? 1 : 0);
    for (const c of codes) add(`W6 activity log, ${k}, error: ${c}`);
    add(`W6 activity log of a lost space, ${k}: own old records shown`, mine); add(`W6 activity log of a lost space, ${k}: own old records in the database`, p.acts); }
  // W7 the page of a lost space: one readable, one not
  for (const kind of ['read', 'other']) { const p = L.find(p => can[p.sid].url && (kind === 'read' ? reads(can[p.sid].out) : !reads(can[p.sid].out))); if (!p) continue;
    net = []; await page.goto(can[p.sid].url.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }).catch(() => { }); await page.waitForTimeout(8000);
    const bad = net.filter(x => x.codes.length || x.status >= 400); const k = kind === 'read' ? 'readable' : 'not readable';
    const txt = (await page.locator('body').innerText().catch(() => '')) || '';
    add(`W7 page of a lost space, ${k}: opened`); add(`W7 page of a lost space, ${k}: GraphQL answers`, net.length); add(`W7 page of a lost space, ${k}: answers with an error`, bad.length);
    for (const x of bad) add(`W7 page, ${k}, error: ${x.op} ${x.codes.join(',') || x.status}`);
    add(`W7 page of a lost space, ${k}: shows an error text`, /something went wrong|unexpected error|error occurred/i.test(txt) ? 1 : 0);
    await page.screenshot({ path: `${OUT}/102-space-${chosen.indexOf(u) + 1}-${kind}.png` }).catch(() => { }); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/102-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/102-detail.json`, 0o600);
for (const k of Object.keys(T).sort()) console.log(`    ${k}: ${T[k]}`);
