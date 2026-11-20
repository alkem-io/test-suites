#!/usr/bin/env node
// 112-invitee-right-walk.mjs: what a leftover invitee right really gives (open row 2, 2026-11-19). For every USER who holds
// "space-invitee" on a private space with no open invitation and is not a member: asked from the RUNNING application, the
// rights the user reports on that space, its About part, its community and its collaboration. Control: the same user on
// another private space of the same level where the user holds nothing.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only on screen.
// usage: 112-invitee-right-walk.mjs <alkemio_db> <kratos_db> <out dir>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 112-invitee-right-walk.mjs <alkemio_db> <kratos_db> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql }).toString().trim();
const rows = psql(DB, `
WITH inv AS (SELECT i."invitedActorId" actor, i."roleSetId", CASE WHEN l."machineState" IS NULL THEN 'pending' ELSE coalesce(l."machineState"::jsonb->>'value','other') END st FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId")
SELECT c."actorId", u.email, s.id, s.level,
  (SELECT o.id FROM space o WHERE o.level=s.level AND o.visibility::text='active' AND o.settings->'privacy'->>'mode'='private' AND o."levelZeroSpaceID"<>s."levelZeroSpaceID"
      AND NOT EXISTS (SELECT 1 FROM credential x JOIN space z ON z."levelZeroSpaceID"=o."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x."resourceID"=z.id::text)
      AND NOT EXISTS (SELECT 1 FROM credential x JOIN space z ON z.id=o."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x."resourceID"=z."accountId"::text) ORDER BY md5(o.id::text) LIMIT 1)
FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL JOIN space s ON s.id::text=c."resourceID" JOIN community cm ON cm.id=s."communityId"
WHERE c.type='space-invitee' AND s.settings->'privacy'->>'mode'='private' AND s.visibility::text='active'
  AND NOT EXISTS (SELECT 1 FROM inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId" AND v.st IN ('pending','invited','accepting'))
  AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x."resourceID"=c."resourceID" AND x.type<>'space-invitee')`).split('\n').filter(Boolean).map(l => l.split('\t'));
const PARTS = { space: 'authorization{ myPrivileges }', about: 'about{ authorization{ myPrivileges } profile{ displayName } }', leads: 'about{ membership{ leadUsers{ id } } }',
  community: 'community{ authorization{ myPrivileges } }', roleset: 'community{ roleSet{ authorization{ myPrivileges } } }', collaboration: 'collaboration{ authorization{ myPrivileges } }', callouts: 'collaboration{ calloutsSet{ callouts{ id } } }' };
const browser = await chromium.launch(); const detail = [];
for (const [u, email, space, level, control] of rows) {
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email.replace(/'/g, "''")}'`); if (!ident) { detail.push({ user: u, skipped: 'no login identity' }); continue; }
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { detail.push({ user: u, skipped: 'sign-in failed' }); await ctx.close(); continue; }
  for (const [kind, id] of [['with the leftover invitee right', space], ['control: nothing held', control]]) { if (!id) continue;
    const d = { user: u, space: id, level, kind }; const up = a => (a?.authorization?.myPrivileges || []).map(s => s.toUpperCase()).sort().join(',') || '-';
    for (const [k, part] of Object.entries(PARTS)) { const r = await gq(`{ lookup { x: space(ID:"${id}"){ ${part} } } }`).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
      d[k] = r.errors ? 'REFUSED' : k === 'space' ? up(x) : k === 'about' ? up(x?.about) + (x?.about?.profile?.displayName != null ? ' name read' : '') : k === 'leads' ? 'leads listed ' + (x?.about?.membership?.leadUsers?.length ?? '-')
        : k === 'community' ? up(x?.community) : k === 'roleset' ? up(x?.community?.roleSet) : k === 'collaboration' ? up(x?.collaboration) : 'callouts seen ' + (x?.collaboration?.calloutsSet?.callouts?.length ?? '-'); }
    detail.push(d); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/112-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/112-detail.json`, 0o600);
console.log(`=== 112 invitee right walk: database ${DB}. Users with a leftover invitee right on a private space, not a member, with a login: ${rows.length}`);
for (const d of detail) console.log(d.skipped ? `  skipped: ${d.skipped}` : `  level ${d.level} | ${d.kind} | space [${d.space}] | about [${d.about}] | ${d.leads} | community [${d.community}] | role set [${d.roleset}] | collaboration [${d.collaboration}] | ${d.callouts}`);
