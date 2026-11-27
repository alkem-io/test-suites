#!/usr/bin/env node
// 113-invitee-subspace-walk.mjs: what the invitee right gives on a SUBSPACE (open row 2, QA lead 2026-11-19: "if the user sees
// the L1 data, not only the About, that would be a problem"). For every user who holds "space-invitee" on a subspace and
// holds nothing else in that top-level space: asked from the RUNNING application, part by part, the rights on the subspace,
// on a sibling subspace of the same privacy where the user holds nothing (control), and on the top-level space.
// The right is the same credential whether the invitation is open, declined or gone (server#6731).
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only on screen.
// usage: 113-invitee-subspace-walk.mjs <alkemio_db> <kratos_db> <out dir>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 113-invitee-subspace-walk.mjs <alkemio_db> <kratos_db> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql }).toString().trim();
// every level: top-level space, subspace, sub-subspace. Case = level + own privacy + privacy of the spaces above.
// Control: another space of the same level and privacy (same top-level space for subspaces; another top-level space for
// level 0) where the user holds nothing. PER_CASE pairs per case (default 3).
const all = psql(DB, `
WITH inv AS (SELECT i."invitedActorId" actor, i."roleSetId", CASE WHEN l."machineState" IS NULL THEN 'pending' ELSE coalesce(l."machineState"::jsonb->>'value','other') END st FROM invitation i LEFT JOIN lifecycle l ON l.id=i."lifecycleId")
SELECT c."actorId", u.email, s.id,
  'L' || s.level || ' ' || (s.settings->'privacy'->>'mode') || CASE WHEN s.level=2 THEN ' in ' || (p.settings->'privacy'->>'mode') || ' L1' ELSE '' END || CASE WHEN s.level>0 THEN ' in ' || (z.settings->'privacy'->>'mode') || ' top' ELSE '' END
   || ' | invitation ' || CASE WHEN EXISTS (SELECT 1 FROM inv v WHERE v.actor=c."actorId" AND v."roleSetId"=cm."roleSetId" AND v.st IN ('pending','invited','accepting')) THEN 'open' ELSE 'gone' END,
  (SELECT o.id FROM space o LEFT JOIN space op ON op.id=o."parentSpaceId" WHERE o.level=s.level AND o.id<>s.id AND o.visibility::text='active' AND o.settings->'privacy'->>'mode'=s.settings->'privacy'->>'mode'
      AND CASE WHEN s.level=0 THEN true ELSE o."levelZeroSpaceID"=s."levelZeroSpaceID" AND op.settings->'privacy'->>'mode'=p.settings->'privacy'->>'mode' END
      AND NOT EXISTS (SELECT 1 FROM credential x JOIN space t ON t."levelZeroSpaceID"=o."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x."resourceID"=t.id::text AND (s.level=0 OR t.id IN (o.id, o."parentSpaceId")))
      AND NOT EXISTS (SELECT 1 FROM credential x JOIN space t ON t.id=o."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x."resourceID"=t."accountId"::text) ORDER BY md5(o.id::text) LIMIT 1),
  CASE WHEN s.level>0 THEN s."levelZeroSpaceID"::text ELSE '' END
FROM credential c JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL JOIN space s ON s.id::text=c."resourceID" JOIN space z ON z.id=s."levelZeroSpaceID" LEFT JOIN space p ON p.id=s."parentSpaceId" JOIN community cm ON cm.id=s."communityId"
WHERE c.type='space-invitee' AND s.visibility::text='active'
  AND NOT EXISTS (SELECT 1 FROM credential x JOIN space t ON t."levelZeroSpaceID"=s."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x."resourceID"=t.id::text AND x.type<>'space-invitee')
  AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND (x.type LIKE 'platform-%' OR (x.type LIKE 'global-%' AND x.type<>'global-registered') OR x."resourceID"=z."accountId"::text))
ORDER BY 4, md5(c.id::text)`).split('\n').filter(Boolean).map(l => l.split('\t'));
const PER = +(process.env.PER_CASE || 3); const cnt = {}; const rows = [];
for (const r of all) { cnt[r[3]] = (cnt[r[3]] || 0) + 1; if (rows.filter(x => x[3] === r[3]).length < PER) rows.push(r); }
console.log('=== candidates per case (user holds the invitee right and nothing else in that top-level space):'); for (const k of Object.keys(cnt).sort()) console.log(`    ${cnt[k]} | ${k}`);
const PARTS = { space: 'authorization{ myPrivileges }', about: 'about{ authorization{ myPrivileges } profile{ displayName } }', leads: 'about{ membership{ leadUsers{ id } } }',
  community: 'community{ authorization{ myPrivileges } }', roleset: 'community{ roleSet{ authorization{ myPrivileges } } }', collaboration: 'collaboration{ authorization{ myPrivileges } }', callouts: 'collaboration{ calloutsSet{ callouts{ id } } }' };
const browser = await chromium.launch(); const detail = [];
for (const [u, email, space, level, control, top] of rows) {
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
  for (const [kind, id] of [['subspace with the invitee right', space], ['control: same kind of space, nothing held', control], ['its top-level space', top]]) { if (!id) continue;
    const d = { user: u, space: id, level, kind }; const up = a => (a?.authorization?.myPrivileges || []).map(s => s.toUpperCase()).sort().join(',') || '-';
    for (const [k, part] of Object.entries(PARTS)) { const r = await gq(`{ lookup { x: space(ID:"${id}"){ ${part} } } }`).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
      d[k] = r.errors ? 'REFUSED' : k === 'space' ? up(x) : k === 'about' ? up(x?.about) + (x?.about?.profile?.displayName != null ? ' name read' : '') : k === 'leads' ? 'leads listed ' + (x?.about?.membership?.leadUsers?.length ?? '-')
        : k === 'community' ? up(x?.community) : k === 'roleset' ? up(x?.community?.roleSet) : k === 'collaboration' ? up(x?.collaboration) : 'callouts seen ' + (x?.collaboration?.calloutsSet?.callouts?.length ?? '-'); }
    detail.push(d); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/113-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/113-detail.json`, 0o600);
console.log(`=== 113 invitee on a subspace walk: database ${DB}. Users with the invitee right on a subspace who hold nothing else in that top-level space, with a login: ${rows.length}`);
for (const d of detail) console.log(d.skipped ? `  skipped: ${d.skipped}` : `  ${d.level} | ${d.kind} | space [${d.space}] | about [${d.about}] | ${d.leads} | community [${d.community}] | role set [${d.roleset}] | collaboration [${d.collaboration}] | ${d.callouts}`);
