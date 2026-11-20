#!/usr/bin/env node
// 107-join-walk.mjs: what a member of the top-level space meets on an OPEN sub-subspace when they are not a member of
// the subspace in between (2026-11-19). Asked from the RUNNING application, per case:
//   list order of the MEMBER list (top first = written by the migration of 2025-06-21, parent first = correct)
//   x subspace private / public with "subspace admins may invite members" on / public with it off.
// Per (user, sub-subspace): can they open it (READ), is JOIN offered, what does joinRoleSet answer, and which
// memberships exist afterwards. Server rule under test: feature 017 (FR-023..FR-028, combined direct join).
// WRITES through the application (joins). Every membership the walk makes is taken away again (removeRoleFromUser as
// the same user; by SQL on the credential rows of the walk when that is refused). A backup is taken first.
// Local stack only. Counts only on screen; ids go to <out dir>/107-detail.json (local only, no e-mail in it).
// usage: ALK_DB=<alkemio_db> 107-join-walk.mjs <alkemio_db> <kratos_db> <out dir>     env: PER_CASE (default 2), REPLAY=<earlier 107-detail.json>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import { needSnapshot } from './lib-snapshot.mjs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 107-join-walk.mjs <alkemio_db> <kratos_db> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
if (needSnapshot('before-107-join-walk') !== DB) { console.error('the local server does not serve ' + DB); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql, maxBuffer: 1 << 28 }).toString().trim();
const PER = +(process.env.PER_CASE || 2);
// candidates: open sub-subspace, active, public itself; a plain member of the top-level space with a login, with no
// credential on the subspace or the sub-subspace, no admin or lead role on top, no platform role, no pending
// invitation or application on the sub-subspace
const SQL = `
SELECT CASE WHEN r."parentCredentials"->0->>'resourceID'=s."levelZeroSpaceID"::text THEN 'top first' WHEN r."parentCredentials"->0->>'resourceID'=ps.id::text THEN 'parent first' END
       || ' | subspace ' || CASE WHEN ps.settings->'privacy'->>'mode'='private' THEN 'private' WHEN (ps.settings->'membership'->>'allowSubspaceAdminsToInviteMembers')::boolean THEN 'public, invite setting on' ELSE 'public, invite setting off' END,
       s.id, ps.id, cm."roleSetId", pcm."roleSetId", c."actorId", u.email
FROM space s JOIN space ps ON ps.id=s."parentSpaceId" JOIN community cm ON cm.id=s."communityId" JOIN community pcm ON pcm.id=ps."communityId"
JOIN role r ON r."roleSetId"=cm."roleSetId" AND r.name::text='member' AND jsonb_array_length(r."parentCredentials")=2
JOIN credential c ON c.type::text='space-member' AND c."resourceID"=s."levelZeroSpaceID"::text JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL
WHERE s.level=2 AND s.visibility::text='active' AND ps.visibility::text='active' AND s.settings->'membership'->>'policy'='open' AND s.settings->'privacy'->>'mode'='public'
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x."resourceID" IN (s.id::text, ps.id::text))
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x.type::text IN ('space-admin','space-lead') AND x."resourceID"=s."levelZeroSpaceID"::text)
 AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND (x.type::text LIKE 'platform-%' OR (x.type::text LIKE 'global-%' AND x.type::text<>'global-registered')))
 AND NOT EXISTS (SELECT 1 FROM credential x JOIN space z ON z.id=s."levelZeroSpaceID" WHERE x."actorId"=c."actorId" AND x.type::text='account-admin' AND x."resourceID"=z."accountId"::text)
 AND NOT EXISTS (SELECT 1 FROM invitation i WHERE i."roleSetId" IN (cm."roleSetId", pcm."roleSetId") AND i."invitedActorId"=c."actorId")
 AND NOT EXISTS (SELECT 1 FROM application a WHERE a."roleSetId" IN (cm."roleSetId", pcm."roleSetId") AND a."userId"=c."actorId")
ORDER BY 1, md5(s.id::text || c."actorId"::text);`;
const cases = {}; const all = {};
// REPLAY=<107-detail.json of an earlier walk>: ask the same (user, sub-subspace) pairs again, under the case name they had then
if (process.env.REPLAY) { for (const d of JSON.parse(fs.readFileSync(process.env.REPLAY, 'utf8'))) {
  const [rs2, rs1, e] = psql(DB, `SELECT cm."roleSetId", pcm."roleSetId", u.email FROM space s JOIN space ps ON ps.id=s."parentSpaceId" JOIN community cm ON cm.id=s."communityId" JOIN community pcm ON pcm.id=ps."communityId" JOIN "user" u ON u.id='${d.user}' WHERE s.id='${d.space}'`).split('\t');
  (cases['was: ' + d.case] ||= []).push({ l2: d.space, l1: d.parent, rs2, rs1, u: d.user, e }); (all['was: ' + d.case] ||= []).push(1); } }
else for (const l of psql(DB, SQL).split('\n')) { const [k, l2, l1, rs2, rs1, u, e] = l.split('\t'); if (!k) continue; (all[k] ||= []).push(1);
  const c = (cases[k] ||= []); if (c.length < PER && !c.some(x => x.l2 === l2 || x.u === u)) c.push({ l2, l1, rs2, rs1, u, e }); }
console.log(`=== 107 join walk: database ${DB}. Open public sub-subspaces, plain top-level members who are not in the subspace. Candidate pairs per case:`);
for (const k of Object.keys(all).sort()) console.log(`    ${all[k].length} pairs | ${k}`);
const memb = (u, id) => psql(DB, `SELECT count(*) FROM credential WHERE "actorId"='${u}' AND type='space-member' AND "resourceID"='${id}'`) === '1';
const Q = id => `{ lookup { x: space(ID:"${id}"){ authorization{ myPrivileges } about{ membership{ myMembershipStatus myPrivileges } } } } }`;
const browser = await chromium.launch(); const detail = [];
for (const k of Object.keys(cases).sort()) for (const c of cases[k]) {
  const d = { case: k, space: c.l2, parent: c.l1, user: c.u }; detail.push(d);
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${c.e.replace(/'/g, "''")}'`); if (!ident) { d.skipped = 'no login identity'; continue; }
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = (q, v) => page.evaluate(async ([q, v]) => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }, [q, v]);
  const short = r => r.errors ? 'REFUSED ' + (r.errors[0].extensions?.code || '') + ' ' + r.errors[0].message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').replace(/\(.*?\)/g, '').slice(0, 90) : 'ok';
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== c.u) { d.skipped = 'sign-in failed'; await ctx.close(); continue; }
  const up = a => (a || []).map(s => s.toUpperCase()).sort();
  const r = await gq(Q(c.l2)).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
  d.can_open = up(x?.authorization?.myPrivileges).includes('READ'); d.status = x?.about?.membership?.myMembershipStatus ?? null;
  d.join_offered = up(x?.about?.membership?.myPrivileges).includes('ROLESET_ENTRY_ROLE_JOIN'); d.read_error = r.errors ? short(r) : null;
  d.join = short(await gq(`mutation($d: JoinAsEntryRoleOnRoleSetInput!){ joinRoleSet(joinData:$d){ id } }`, { d: { roleSetID: c.rs2 } }).catch(() => ({ errors: [{ message: 'thrown' }] })));
  d.member_of_sub_subspace = memb(c.u, c.l2); d.member_of_subspace = memb(c.u, c.l1);
  // put back: sub-subspace first, then the subspace
  d.undo = [];
  for (const [id, rs] of [[c.l2, c.rs2], [c.l1, c.rs1]]) { if (!memb(c.u, id)) continue;
    let how = short(await gq(`mutation($d: RemoveRoleOnRoleSetInput!){ removeRoleFromUser(roleData:$d){ id } }`, { d: { roleSetID: rs, actorID: c.u, role: 'MEMBER' } }).catch(() => ({ errors: [{ message: 'thrown' }] })));
    if (memb(c.u, id)) { psql(DB, `DELETE FROM credential WHERE "actorId"='${c.u}' AND type='space-member' AND "resourceID"='${id}'`); how = 'by SQL (' + how + ')'; }
    d.undo.push(how); }
  d.left_behind = (memb(c.u, c.l2) ? 1 : 0) + (memb(c.u, c.l1) ? 1 : 0);
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/107-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/107-detail.json`, 0o600);
for (const k of Object.keys(cases).sort()) { console.log(`  ${k}`);
  for (const d of detail.filter(d => d.case === k)) console.log(d.skipped ? `      skipped: ${d.skipped}` :
    `      can open ${d.can_open} | join offered ${d.join_offered} | join answer: ${d.join} | after: member of sub-subspace ${d.member_of_sub_subspace}, of subspace ${d.member_of_subspace} | undo: ${d.undo.join('; ') || 'nothing to undo'} | left behind ${d.left_behind}${d.read_error ? ' | read: ' + d.read_error : ''}`); }
