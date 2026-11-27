#!/usr/bin/env node
// 109-new-post-image-walk.mjs: can a member of a space above upload the image of a NEW post on a public sub-subspace with
// inherited member rights (2026-11-19)? The client (useStorageConfig, callout create flow) uploads such an image to the
// storage of the SPACE (space.profile.storageBucket) with temporaryLocation, before the post exists. The server gives the
// right to create the post to members of EVERY space above (contribute rule), but file upload on the space storage only to
// members of the FIRST entry of the member list (space.service.authorization.ts getActorCriteria).
// Per sub-subspace of an earlier walk 108 (its detail file), two users who are not member of the sub-subspace:
//   "top only"  member of the top-level space, not of the subspace        "subspace"  member of the subspace
// Asked from the RUNNING application: rights reported on both storages of the space, then a real upload of a 1 pixel PNG.
// WRITES: an accepted upload makes one document; it is deleted again (deleteDocument as the same user, else by SQL on
// that one row). A backup is taken first. Local stack only. Counts only on screen; ids in <out dir>/109-detail.json.
// usage: ALK_DB=<alkemio_db> 109-new-post-image-walk.mjs <alkemio_db> <kratos_db> <108-detail.json> <out dir>   env: SPACES (default 4)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import { needSnapshot } from './lib-snapshot.mjs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [DB, KDB, DETAIL, OUT] = process.argv.slice(2); if (!OUT) { console.error('usage: 109-new-post-image-walk.mjs <alkemio_db> <kratos_db> <108-detail.json> <out dir>'); process.exit(2); }
const BASE = process.env.BASE || 'http://localhost:3000';
if (!/^http:\/\/localhost(:\d+)?$/.test(BASE)) { console.error('local stack only'); process.exit(2); }
if (needSnapshot('before-109-new-post-image-walk') !== DB) { console.error('the local server does not serve ' + DB); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql }).toString().trim();
const N = +(process.env.SPACES || 4); const todo = []; const seen = new Set();
for (const d of JSON.parse(fs.readFileSync(DETAIL, 'utf8'))) { if (seen.has(d.space) || todo.length >= N * 2) continue; seen.add(d.space);
  if (todo.filter(t => t.group === d.group).length >= Math.ceil(N / 2)) continue;
  todo.push({ space: d.space, group: d.group, who: 'top only', user: d.user });
  // a plain member of the subspace with a login who holds nothing on the sub-subspace
  const u = psql(DB, `SELECT c."actorId" FROM space s JOIN credential c ON c.type='space-member' AND c."resourceID"=s."parentSpaceId"::text JOIN "user" u ON u.id=c."actorId" AND u."authenticationID" IS NOT NULL
    WHERE s.id='${d.space}' AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND x."resourceID"=s.id::text)
      AND NOT EXISTS (SELECT 1 FROM credential x WHERE x."actorId"=c."actorId" AND (x.type LIKE 'platform-%' OR (x.type LIKE 'global-%' AND x.type<>'global-registered') OR (x.type IN ('space-admin','space-lead','space-subspace-admin') AND x."resourceID" IN (s."parentSpaceId"::text, s."levelZeroSpaceID"::text)) OR x.type='account-admin'))
    ORDER BY md5(c."actorId"::text) LIMIT 1`);
  if (u) todo.push({ space: d.space, group: d.group, who: 'subspace', user: u }); }
const Q = id => `{ lookup { x: space(ID:"${id}"){ collaboration{ calloutsSet{ authorization{ myPrivileges } } } profile{ storageBucket{ id authorization{ myPrivileges } } } about{ profile{ storageBucket{ authorization{ myPrivileges } } } } } } }`;
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const browser = await chromium.launch(); const detail = []; const sessions = {};
for (const t of todo) {
  detail.push(t);
  if (!sessions[t.user]) {
    const email = psql(DB, `select email from "user" where id='${t.user}'`);
    const ident = psql(KDB, `select id from identities where traits->>'email' = '${email.replace(/'/g, "''")}'`); if (!ident) { t.skipped = 'no login identity'; continue; }
    const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
      'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
    await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
    await page.goto(BASE + '/robots.txt').catch(() => { });
    sessions[t.user] = page; }
  const page = sessions[t.user];
  const gq = (q, v) => page.evaluate(async ([q, v]) => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }, [q, v]);
  const me = await gq('{ me { user { id } } }').catch(() => null); if (me?.data?.me?.user?.id !== t.user) { t.skipped = 'sign-in failed'; continue; }
  const short = r => r.errors ? 'REFUSED ' + (r.errors[0].extensions?.code || '') + ' ' + r.errors[0].message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').slice(0, 70) : 'ok';
  const r = await gq(Q(t.space)).catch(() => ({ errors: [{ message: 'thrown' }] })); const x = r.data?.lookup?.x;
  const has = (a, p) => (a?.authorization?.myPrivileges || []).map(s => s.toUpperCase()).includes(p);
  t.may_create_post = has(x?.collaboration?.calloutsSet, 'CREATE_CALLOUT'); t.read = r.errors ? short(r) : 'ok';
  t.upload_right_space_storage = has(x?.profile?.storageBucket, 'FILE_UPLOAD'); t.upload_right_about_storage = has(x?.about?.profile?.storageBucket, 'FILE_UPLOAD');
  let bucket = x?.profile?.storageBucket?.id;
  if (!bucket) bucket = psql(DB, `SELECT p."storageBucketId" FROM actor a JOIN profile p ON p.id=a."profileId" WHERE a.id='${t.space}'`), t.bucket_from = 'database (not readable for the user)';
  if (!bucket) { t.upload = 'no bucket found'; continue; }
  const up = await page.evaluate(async ([bucket, png]) => {
    const fd = new FormData();
    fd.append('operations', JSON.stringify({ query: 'mutation($file: Upload!, $d: StorageBucketUploadFileInput!){ uploadFileOnStorageBucket(file:$file, uploadData:$d){ id url } }', variables: { file: null, d: { storageBucketId: bucket, temporaryLocation: true } } }));
    fd.append('map', JSON.stringify({ 0: ['variables.file'] }));
    fd.append('0', new Blob([Uint8Array.from(atob(png), c => c.charCodeAt(0))], { type: 'image/png' }), 'qa-109.png');
    const r = await fetch('/api/private/graphql', { method: 'POST', credentials: 'include', headers: { 'apollo-require-preflight': 'true' }, body: fd }); return r.json().catch(() => ({ errors: [{ message: 'no json, http ' + r.status }] })); }, [bucket, PNG]).catch(e => ({ errors: [{ message: 'thrown ' + e.message }] }));
  t.upload = short(up); const doc = up.data?.uploadFileOnStorageBucket?.id;
  if (doc) { t.undo = short(await gq(`mutation($d: DeleteDocumentInput!){ deleteDocument(deleteData:$d){ id } }`, { d: { ID: doc } }).catch(() => ({ errors: [{ message: 'thrown' }] })));
    if (psql(DB, `select count(*) from document where id='${doc}'`) !== '0') { psql(DB, `delete from document where id='${doc}'`); t.undo = 'by SQL (' + t.undo + ')'; } }
}
await browser.close();
fs.writeFileSync(`${OUT}/109-detail.json`, JSON.stringify(detail, null, 1)); fs.chmodSync(`${OUT}/109-detail.json`, 0o600);
console.log(`=== 109 new post image walk: database ${DB}, ${new Set(detail.map(d => d.space)).size} sub-subspaces (public, inherit on), users who are not member of the sub-subspace`);
for (const d of detail) console.log(d.skipped ? `  ${d.who} | skipped: ${d.skipped}` :
  `  list before the repair: ${d.group} | user: ${d.who} | may create a post ${d.may_create_post} | upload right on the space storage ${d.upload_right_space_storage}, on the about storage ${d.upload_right_about_storage} | real upload: ${d.upload}${d.undo ? ' | undo: ' + d.undo : ''}${d.bucket_from ? ' | bucket id from the ' + d.bucket_from : ''}${d.read !== 'ok' ? ' | read: ' + d.read : ''}`);
