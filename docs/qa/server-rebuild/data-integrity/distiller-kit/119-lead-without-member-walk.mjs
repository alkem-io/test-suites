#!/usr/bin/env node
// 119-lead-without-member-walk.mjs: how a lead who is not a member shows in the community lists (open row 5, 2026-11-20).
// Asked from the RUNNING application as an ADMIN OF THE SPACE, for every space with such a lead: the lead and member
// lists of the role set (what the community tab of the settings reads) and the lead lists of the About part (what the
// space page shows). Per case: is the actor in the lead list, in the member list, in the About leads, any error.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only on screen.
// Writes <out file> (ids, local only).
// usage: 119-lead-without-member-walk.mjs <alkemio_db> <kratos_db> <out file>     env: REPLAY=<earlier out file>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUTFILE] = process.argv.slice(2); if (!OUTFILE) { console.error('usage: 119-lead-without-member-walk.mjs <alkemio_db> <kratos_db> <out file>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 26 }).toString().trim();
// [space, role set, actor, actor type, level, admin to ask as]
// REPLAY=<earlier out file>: ask the same cases again as the same users (after a repair the selection below finds none)
const todo = process.env.REPLAY ? JSON.parse(fs.readFileSync(process.env.REPLAY, 'utf8')).map(r => [r.space, r.rs, r.actor, r.atype, r.level, r.asked_as, '']) : psql(DB, `
SELECT s.id, cm."roleSetId", c."actorId", a.type::text, s.level,
       (SELECT x."actorId" FROM credential x JOIN "user" u ON u.id=x."actorId" AND u."authenticationID" IS NOT NULL WHERE x.type='space-admin' AND x."resourceID" IN (s.id::text, s."levelZeroSpaceID"::text) AND x."actorId"<>c."actorId"
         ORDER BY (x."resourceID"=s.id::text) DESC, md5(x."actorId"::text) LIMIT 1),
       (SELECT x."actorId" FROM credential x JOIN "user" u ON u.id=x."actorId" AND u."authenticationID" IS NOT NULL WHERE x.type='platform-operations-admin' AND x."actorId"<>c."actorId" ORDER BY md5(x."actorId"::text) LIMIT 1)
FROM credential c JOIN actor a ON a.id=c."actorId" JOIN space s ON s.id::text=c."resourceID" JOIN community cm ON cm.id=s."communityId"
WHERE c.type='space-lead' AND NOT EXISTS (SELECT 1 FROM credential m WHERE m."actorId"=c."actorId" AND m.type='space-member' AND m."resourceID"=c."resourceID")`).split('\n').filter(Boolean).map(l => l.split('\t'));
const byUser = {}; let noAdmin = 0; // no admin of the space with a login: asked as a platform admin (t[6]); counted apart
let asPlatform = 0; for (const t of todo) { if (!t[5] && t[6]) { t[5] = t[6]; asPlatform++; } if (!t[5]) { noAdmin++; continue; } (byUser[t[5]] ||= []).push(t); }
const browser = await chromium.launch(); const res = []; let noLogin = 0;
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
  for (const [space, rs, actor, atype, level] of byUser[u]) { const org = atype === 'organization';
    const ask = async (name, q, pick) => { const r = await gq(q).catch(e => ({ errors: [{ message: 'thrown ' + e.message }] })); const l = pick(r.data);
      return r.errors || !l ? 'error: ' + ((r.errors?.[0]?.extensions?.code || '') + ' ' + (r.errors?.[0]?.message || 'no data')).replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').slice(0, 90) : (l.some(x => x.id === actor) ? 'listed' : 'not listed'); };
    const f = org ? 'organizationsInRole' : 'usersInRole';
    res.push({ space, rs, actor, atype, level, asked_as: u,
      lead_list: await ask('lead', `{ lookup { roleSet(ID:"${rs}"){ x: ${f}(role: LEAD){ id } } } }`, d => d?.lookup?.roleSet?.x),
      member_list: await ask('member', `{ lookup { roleSet(ID:"${rs}"){ x: ${f}(role: MEMBER){ id } } } }`, d => d?.lookup?.roleSet?.x),
      about_leads: await ask('about', `{ lookup { space(ID:"${space}"){ about{ membership{ x: ${org ? 'leadOrganizations' : 'leadUsers'}{ id } } } } } }`, d => d?.lookup?.space?.about?.membership?.x) }); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(OUTFILE, JSON.stringify(res, null, 1)); fs.chmodSync(OUTFILE, 0o600);
console.log(`=== 119 lead without member walk: database ${DB}. Cases ${todo.length}, asked ${res.length}; of them as a platform admin ${asPlatform}; nobody to ask as ${noAdmin}; sign-in not possible ${noLogin}`);
const n = {}; for (const r of res) { const k = `${r.atype} L${r.level} | settings lead list: ${r.lead_list} | settings member list: ${r.member_list} | About leads: ${r.about_leads}`; n[k] = (n[k] || 0) + 1; }
for (const k of Object.keys(n).sort()) console.log(`    ${n[k]} x ${k}`);
