#!/usr/bin/env node
// 78-user-access-walk.mjs: ask the running application, signed in as ONE non-admin user, what that user may do on every
// whiteboard, memo, office document, role set, space and callout, and compare with what the database says (the model
// written by 73-access-model-export.py <db> <out.json> <same e-mail>). Then: memo text and office editor address are
// given for exactly the readable ones; the live editing connection serves exactly the readable ones; a spread of update
// and role attempts the user has no right to are all refused.
// Sign-in is a one-time recovery link from the LOCAL login service. Local stack only. Prints counts only.
// usage: 78-user-access-walk.mjs <kratos_db> <user e-mail> <model.json> <out dir> [--no-sockets]
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import { needSnapshot } from './lib-snapshot.mjs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [KDB, EMAIL, MODEL, OUT] = process.argv.slice(2); const SOCKETS = !process.argv.includes('--no-sockets');
const BASE = process.env.BASE || 'http://localhost:3000';
// local stack, or the stack of a distiller run declared a second time in STACK_BASE. Never an Alkemio environment.
if (!(/^http:\/\/localhost(:\d+)?$/.test(BASE) || (process.env.STACK_BASE === BASE && !/alkem\.io/i.test(BASE)))) { console.error('local stack or a declared distiller stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
needSnapshot('before-78-user-walk');   // part D attempts writes: a backup of the start state must exist
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At'], { input: sql }).toString().trim();
const ident = psql(KDB, `select id from identities where traits->>'email' = '${EMAIL.replace(/'/g, "''")}'`);
if (!ident) { console.error('no login identity for that e-mail'); process.exit(2); }
const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
  'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
const model = JSON.parse(fs.readFileSync(MODEL)); const O = model.objects;
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
await page.goto(BASE + '/robots.txt').catch(() => { });   // a light page on the same origin to run requests from
const gq = (query, variables) => page.evaluate(async ([q, v]) => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }, [query, variables]);
const me = await gq('{ me { user { id email } } platform { roleSet { myRoles } } }');
const uid = me?.data?.me?.user?.id; const ok = me?.data?.me?.user?.email === EMAIL && uid === model.focus;
console.log(`=== 78 user access walk: signed in as the model's user: ${ok}; platform roles held: ${me?.data?.platform?.roleSet?.myRoles?.length}`);
if (!ok) { await browser.close(); process.exit(3); }
const pool = async (items, n, fn) => { const out = new Array(items.length); let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; };
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const want = s => new Set((s || '').split('+').filter(Boolean));
const FIELD = { whiteboard: 'whiteboard', memo: 'memo', roleset: 'roleSet', space: 'space', callout: 'callout' };
const report = {}; const detail = {};
// A. rights, object by object
for (const kind of Object.keys(FIELD)) {
  const ids = Object.keys(O[kind] || {}); if (!ids.length) continue;
  const extra = kind === 'memo' ? ' markdown' : '';
  const got = {}; const errs = {};
  await pool(chunks(ids, 25), 4, async part => {
    const q = '{' + part.map((id, i) => `a${i}: lookup { x: ${FIELD[kind]}(ID:"${id}"){ authorization{ myPrivileges }${extra} } }`).join(' ') + '}';
    let r; try { r = await gq(q); } catch (e) { r = { errors: [{ message: 'thrown' }] }; }
    for (const e of r.errors || []) { const i = Number(String(e.path?.[0] || '').slice(1)); if (!Number.isNaN(i) && part[i]) errs[part[i]] = e.extensions?.code || 'ERR'; else errs['request'] = (e.message || '').slice(0, 80); }
    part.forEach((id, i) => { const x = r.data?.[`a${i}`]?.x; if (x) got[id] = { p: x.authorization?.myPrivileges || [], text: kind === 'memo' ? (x.markdown !== null && x.markdown !== undefined) : undefined }; });
  });
  // a batch can fail as a whole (seen once: 25 memos with no answer and no error). Ask again one by one for those.
  let asked = 0; for (const id of ids) if (!got[id] && !errs[id]) { asked++; const r = await gq(`{ lookup { x: ${FIELD[kind]}(ID:"${id}"){ authorization{ myPrivileges }${extra} } } }`).catch(() => ({ errors: [{ message: 'thrown' }] }));
    const x = r.data?.lookup?.x; if (x) got[id] = { p: x.authorization?.myPrivileges || [], text: kind === 'memo' ? (x.markdown !== null && x.markdown !== undefined) : undefined }; else errs[id] = r.errors?.[0]?.extensions?.code || 'ERR'; }
  let equal = 0, readable = 0, refusedOk = 0, mism = [], refusedKinds = {}, textOk = 0, textBad = 0;
  for (const id of ids) {
    const w = want(O[kind][id][1]); const g = got[id];
    if (w.has('READ')) readable++;
    if (g) { const gs = new Set(g.p); const same = gs.size === w.size && [...w].every(x => gs.has(x)); if (same) equal++; else mism.push({ id, model: [...w].sort().join('+'), app: [...gs].sort().join('+') });
      if (kind === 'memo') { if (g.text === w.has('READ')) textOk++; else textBad++; } }
    else { refusedKinds[errs[id] || 'no answer'] = (refusedKinds[errs[id] || 'no answer'] || 0) + 1; if (!w.has('READ')) refusedOk++; else mism.push({ id, model: [...w].sort().join('+'), app: 'REFUSED ' + (errs[id] || '') }); }
  }
  report[kind] = { objects: ids.length, readablePerDatabase: readable, answered: Object.keys(got).length, equal, refusedAndNotReadable: refusedOk, mismatches: mism.length, askedAgainOneByOne: asked, refusedKinds, requestErrors: errs.request || null };
  if (kind === 'memo') report[kind].textGivenExactlyWhenReadable = `${textOk} ok, ${textBad} not`;
  detail[kind] = mism;
}
// B. office editor address
{ const ids = Object.keys(O.office || {}); let given = 0, bad = 0;
  await pool(ids, 4, async id => { const r = await gq('query($id:UUID!){ collaboraEditorUrl(collaboraDocumentID:$id){ editorUrl } }', { id }); const g = !!r.data?.collaboraEditorUrl?.editorUrl; if (g) given++; if (g !== want(O.office[id][1]).has('READ')) bad++; });
  report.office = { objects: ids.length, readablePerDatabase: ids.filter(i => want(O.office[i][1]).has('READ')).length, editorAddressGiven: given, notAsTheDatabaseSays: bad }; }
// C. live editing connection
if (SOCKETS) for (const [kind, type] of [['memo', 'memo'], ['whiteboard', 'whiteboard']]) {
  const ids = Object.keys(O[kind]); const res = [];
  for (const part of chunks(ids, 200)) res.push(...await page.evaluate(async ([part, type]) => {
    const one = id => new Promise(done => { let fin = false; const end = v => { if (!fin) { fin = true; try { ws.close(); } catch { } done(v); } };
      const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/collab/${id}?type=${type}`); ws.binaryType = 'arraybuffer';
      ws.onmessage = () => end('served'); ws.onclose = e => end('closed ' + e.code); ws.onerror = () => { }; ws.onopen = () => setTimeout(() => end('open, silent'), 4000); setTimeout(() => end('timeout'), 9000); });
    const out = new Array(part.length); let i = 0; await Promise.all(Array.from({ length: 8 }, async () => { while (i < part.length) { const k = i++; out[k] = await one(part[k]); } })); return out; }, [part, type]));
  const tally = {}; let bad = 0; ids.forEach((id, i) => { const r = want(O[kind][id][1]).has('READ'); const k = (r ? 'readable: ' : 'not readable: ') + res[i]; tally[k] = (tally[k] || 0) + 1; if ((res[i] === 'served') !== r) bad++; });
  report['live connection ' + kind] = { tally, notAsTheDatabaseSays: bad };
}
// D. attempts the user has no right to: all must be refused
{ const spread = (ids, n) => ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / n)) === 0).slice(0, n);
  const lacking = (kind, priv, readable) => Object.keys(O[kind]).filter(id => { const w = want(O[kind][id][1]); return !w.has(priv) && w.has('READ') === readable; });
  const tries = [];
  for (const [kind, m, arg] of [['whiteboard', 'updateWhiteboard', 'whiteboardData'], ['memo', 'updateMemo', 'memoData'], ['callout', 'updateCallout', 'calloutData'], ['space', 'updateSpace', 'spaceData']])
    for (const readable of [true, false]) for (const id of spread(lacking(kind, 'UPDATE', readable), 15)) tries.push({ what: `${m} ${readable ? 'readable' : 'unreadable'}`, q: `mutation{ ${m}(${arg}:{ID:"${id}"}){ id } }` });
  for (const id of spread(lacking('roleset', 'GRANT', true), 20)) tries.push({ what: 'make myself admin', rs: id, q: `mutation{ assignRoleToUser(roleData:{actorID:"${uid}", role:ADMIN, roleSetID:"${id}"}){ id } }` });
  const tally = {}; let accepted = 0;
  for (const t of tries) { const r = await gq(t.q); const k = t.what + ': ' + (r.errors ? 'refused ' + (r.errors[0].extensions?.code || '') : 'ACCEPTED'); tally[k] = (tally[k] || 0) + 1;
    if (!r.errors) { accepted++; if (t.rs) await gq(`mutation{ removeRoleFromUser(roleData:{actorID:"${uid}", role:ADMIN, roleSetID:"${t.rs}"}){ id } }`); } }
  report['attempts without the right'] = { tried: tries.length, accepted, tally }; }
await browser.close();
fs.writeFileSync(`${OUT}/78-detail.json`, JSON.stringify(detail, null, 1));
for (const [k, v] of Object.entries(report)) console.log(`    ${k}: ${JSON.stringify(v)}`);
const kinds = {}; for (const [k, a] of Object.entries(detail)) for (const m of a) { const key = `${k}: database [${m.model}] application [${m.app}]`; kinds[key] = (kinds[key] || 0) + 1; }
console.log('    mismatch kinds (top 15):'); for (const [k, n] of Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`      ${n} x ${k}`);
