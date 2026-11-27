#!/usr/bin/env node
// 108-upload-rights-walk.mjs: file upload rights of a plain top-level member on a public sub-subspace with inherited
// member rights (2026-11-19). Question after repair 105 (parent first): the server adds the FIRST entry of the member
// list to the rule "members may upload files to the storage of the space" (space.service.authorization.ts,
// getActorCriteria). With top first that went to top-level members, with parent first to subspace members. Does a
// top-level member still get FILE_UPLOAD where they add content? Asked from the RUNNING application on the pairs of an
// earlier walk 103 (its detail file): the storage of the space profile, and the storage of every callout they can see.
// Reads only (the sign-in writes a session into the local login database). Local stack only. Counts only.
// usage: 108-upload-rights-walk.mjs <alkemio_db> <kratos_db> <103-detail.json of the walk BEFORE the repair> <out dir>
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, DETAIL, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 108-upload-rights-walk.mjs <alkemio_db> <kratos_db> <103-detail.json> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql }).toString().trim();
// group of a pair as it was before the repair: short list / top first (had CREATE_SUBSPACE through the first entry) / parent first
const byUser = {};
for (const d of JSON.parse(fs.readFileSync(DETAIL, 'utf8'))) (byUser[d.user] ||= []).push({ space: d.space, group: d.group === 'parent only' ? 'short list before' : d.space_priv.includes('CREATE_SUBSPACE') ? 'top first before' : 'parent first always' });
const Q = id => `{ lookup { x: space(ID:"${id}"){ authorization{ myPrivileges } about{ profile{ storageBucket{ authorization{ myPrivileges } } } }
  collaboration{ authorization{ myPrivileges } calloutsSet{ callouts{ framing{ profile{ storageBucket{ authorization{ myPrivileges } } } } } } } } } }`;
const browser = await chromium.launch(); const detail = [];
for (const u of Object.keys(byUser)) {
  const email = psql(DB, `select email from "user" where id='${u}'`);
  const ident = psql(KDB, `select id from identities where traits->>'email' = '${email.replace(/'/g, "''")}'`); if (!ident) continue;
  const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
    'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
  await page.goto(BASE + '/robots.txt').catch(() => { });
  const gq = q => page.evaluate(async q => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q }) }); return r.json(); }, q);
  const me = await gq('{ me { user { id } } }').catch(() => null);
  if (me?.data?.me?.user?.id !== u) { await ctx.close(); continue; }
  for (const p of byUser[u]) {
    const r = await gq(Q(p.space)).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
    const has = (a, pr) => (a?.authorization?.myPrivileges || []).map(s => s.toUpperCase()).includes(pr);
    const cs = x?.collaboration?.calloutsSet?.callouts || [];
    detail.push({ ...p, user: u, error: r.errors?.[0]?.extensions?.code || null, contribute: has(x?.collaboration, 'CONTRIBUTE'), create_subspace: has(x, 'CREATE_SUBSPACE'),
      upload_space_profile: has(x?.about?.profile?.storageBucket, 'FILE_UPLOAD'), callouts: cs.length, callouts_with_upload: cs.filter(c => has(c.framing?.profile?.storageBucket, 'FILE_UPLOAD')).length }); }
  await ctx.close(); }
await browser.close();
fs.writeFileSync(`${OUT}/108-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/108-detail.json`, 0o600);
console.log(`=== 108 upload rights walk: database ${DB}, ${detail.length} pairs, ${new Set(detail.map(d => d.user)).size} users (plain top-level members, not in the subspace; sub-subspace public, inherit on)`);
for (const g of ['short list before', 'top first before', 'parent first always']) { const ds = detail.filter(d => d.group === g); const n = f => ds.filter(f).length;
  console.log(`  ${g}: ${ds.length} pairs | may contribute ${n(d => d.contribute)} | create subspace ${n(d => d.create_subspace)} | upload on the space profile storage ${n(d => d.upload_space_profile)} | callouts seen ${ds.reduce((a, d) => a + d.callouts, 0)}, of which upload on the callout storage ${ds.reduce((a, d) => a + d.callouts_with_upload, 0)} | errors ${n(d => d.error)}`); }
