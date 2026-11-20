#!/usr/bin/env node
// 77-page-walk.mjs: open real pages of the local application in a headless browser as one user and record what a person
// would see: the callout or page that rendered, error screens, failed GraphQL fields, failed file loads, console errors.
// Sign-in is a one-time recovery link from the LOCAL login service (no password is read or stored).
// Local stack only: refuses any base address that is not localhost. Output holds page text and handles: local only.
// usage: 77-page-walk.mjs <kratos_db> <user e-mail> <pages.json> <out dir> [--shots]
//   pages.json: [{"key": "...", "kind": "callout|space|settings|other", "url": "/path"}]
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [KDB, EMAIL, PAGES, OUT] = process.argv.slice(2); const SHOTS = process.argv.includes('--shots');
const BASE = process.env.BASE || 'http://localhost:3000';
// local stack, or the stack of a distiller run declared a second time in STACK_BASE. Never an Alkemio environment.
if (!(/^http:\/\/localhost(:\d+)?$/.test(BASE) || (process.env.STACK_BASE === BASE && !/alkem\.io/i.test(BASE)))) { console.error('local stack or a declared distiller stack only'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At'], { input: sql }).toString().trim();
const ident = psql(KDB, `select id from identities where traits->>'email' = '${EMAIL.replace(/'/g, "''")}'`);
if (!ident) { console.error('no login identity for that e-mail'); process.exit(2); }
const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
  'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
const pages = JSON.parse(fs.readFileSync(PAGES));
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
const me = await page.evaluate(async () => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: '{ me { user { id email } } platform { roleSet { myRoles } } }' }) }); return r.json(); });
const signedIn = me?.data?.me?.user?.email === EMAIL;
console.log(`=== 77 page walk: signed in as the requested user: ${signedIn}; platform roles held: ${me?.data?.platform?.roleSet?.myRoles?.length ?? 'n/a'}; pages ${pages.length}`);
if (!signedIn) { await browser.close(); process.exit(3); }
const res = []; let next = 0; const N = Number(process.env.TABS || 4);
const worker = async (pg) => {
  let cur = null;
  pg.on('console', m => { if (cur && m.type() === 'error') cur.console.push(m.text().slice(0, 160)); });
  pg.on('pageerror', e => { if (cur) cur.pageErrors.push(String(e).slice(0, 200)); });
  pg.on('response', async r => {
    const c = cur; if (!c) return; const u = r.url();
    if (u.includes('/graphql')) { try { const j = await r.json(); for (const e of j.errors || []) c.gql.push(`${e.extensions?.code || 'ERR'}:${(e.path || []).filter(x => typeof x === 'string').join('.')}`); } catch { } }
    else if (r.status() >= 400) { c.httpUrls.push(`${r.status()} ${u}`); c.http.push(`${r.status()} ${u.includes('/storage/document/') ? 'stored file' : u.includes('/api/') ? 'api' : new URL(u).host === new URL(BASE).host ? 'app asset' : 'outside host'}`); }
  });
  while (next < pages.length) {
    const p = pages[next++];
    cur = { key: p.key, kind: p.kind, url: p.url, console: [], pageErrors: [], gql: [], http: [], httpUrls: [] };
    try {
      await pg.goto(BASE + p.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await pg.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
      await pg.waitForTimeout(1500);
      Object.assign(cur, await pg.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 50 && r.height > 50; };
        const dl = [...document.querySelectorAll('[role=dialog]')].filter(vis).sort((a, b) => b.innerText.length - a.innerText.length)[0];
        const body = document.body.innerText;
        const marker = (body.match(/something went wrong|page not found|restricted|do not have access|don't have access|unable to grant/i) || [null])[0];
        const bad = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:')); const imgs = bad.length;
        const brokenSrc = bad.map(i => i.src);
        return { final: location.pathname, title: document.title, mainLen: (document.querySelector('main')?.innerText || '').length, dialog: !!dl, dialogLen: dl ? dl.innerText.length : 0,
          dialogHead: dl ? dl.innerText.replace(/\s+/g, ' ').slice(0, 160) : null, marker, brokenImages: imgs, brokenSrc,
          tabs: [...document.querySelectorAll('[role=tab]')].map(t => t.innerText.trim() + (t.getAttribute('aria-selected') === 'true' ? '*' : '')) };
      }));
      if (SHOTS) await pg.screenshot({ path: `${OUT}/${p.key.replace(/[^a-z0-9-]/gi, '_')}.png` });
    } catch (e) { cur.thrown = String(e).slice(0, 200); }
    res.push(cur); cur = null;
  }
};
await Promise.all([page, ...await Promise.all(Array.from({ length: N - 1 }, () => ctx.newPage()))].map(worker));
res.sort((a, b) => Number(a.key.split(':')[1]) - Number(b.key.split(':')[1]));
await browser.close();
fs.writeFileSync(`${OUT}/77-pages.json`, JSON.stringify(res, null, 1));
const by = {}; for (const r of res) { const k = r.key.split(':')[0]; (by[k] ||= []).push(r); }
const cnt = (a, f) => a.filter(f).length; const uniq = a => [...new Set(a)];
console.log(`    ${'set'.padEnd(26)} pages moved dialog marker gqlErr brokenImg fileErr pageErr thrown`);
for (const [k, a] of Object.entries(by))
  console.log(`    ${k.padEnd(26)} ${String(a.length).padStart(5)} ${String(cnt(a, r => r.final && r.final !== r.url)).padStart(5)} ${String(cnt(a, r => r.dialog)).padStart(6)} ${String(cnt(a, r => r.marker)).padStart(6)} ${String(cnt(a, r => r.gql.length)).padStart(6)} ${String(cnt(a, r => r.brokenImages)).padStart(9)} ${String(cnt(a, r => r.http.some(h => h.includes('stored file')))).padStart(7)} ${String(cnt(a, r => r.pageErrors.length)).padStart(7)} ${String(cnt(a, r => r.thrown)).padStart(6)}`);
console.log('    graphql errors seen:', JSON.stringify(Object.fromEntries(Object.entries(res.flatMap(r => uniq(r.gql)).reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 25))));
console.log('    http errors seen:', JSON.stringify(res.flatMap(r => r.http).reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})));
console.log('    markers seen:', JSON.stringify(res.filter(r => r.marker).reduce((m, r) => (m[r.marker.toLowerCase()] = (m[r.marker.toLowerCase()] || 0) + 1, m), {})));
