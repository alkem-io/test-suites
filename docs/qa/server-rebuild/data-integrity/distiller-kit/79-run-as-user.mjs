#!/usr/bin/env node
// 79-run-as-user.mjs: sign in on the LOCAL stack as one user (one-time recovery link from the local login service, no
// password) and run a steps file against the GraphQL API with that user's session. For write checks on an experiment
// database: every steps file must put back what it changes. Local stack only.
// usage: 79-run-as-user.mjs <kratos_db> <user e-mail> <steps.mjs> [args...]
//   steps.mjs: export default async ({ gq, uid, args, short }) => result   (result is printed as JSON)
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import path from 'path';
import { needSnapshot } from './lib-snapshot.mjs';
const require = createRequire(process.env.PW_FROM || new URL('../../../../../package.json', import.meta.url).pathname);
const { chromium } = require('playwright');
const [KDB, EMAIL, STEPS, ...args] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://localhost:3000';
// local stack, or the stack of a distiller run declared a second time in STACK_BASE. Never an Alkemio environment.
if (!(/^http:\/\/localhost(:\d+)?$/.test(BASE) || (process.env.STACK_BASE === BASE && !/alkem\.io/i.test(BASE)))) { console.error('local stack or a declared distiller stack only'); process.exit(2); }
needSnapshot('before-' + path.basename(STEPS, '.mjs'));   // steps files write: a backup of the start state must exist
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At'], { input: sql }).toString().trim();
const ident = psql(KDB, `select id from identities where traits->>'email' = '${EMAIL.replace(/'/g, "''")}'`);
if (!ident) { console.error('no login identity for that e-mail'); process.exit(2); }
const link = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'container:alkemio_dev_kratos', 'curlimages/curl', '-s', '-X', 'POST',
  'http://localhost:4434/admin/recovery/link', '-H', 'content-type: application/json', '-d', JSON.stringify({ identity_id: ident, expires_in: '10m' })]).toString()).recovery_link;
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
await page.goto(link.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(4000);
const gq = (query, variables) => page.evaluate(async ([q, v]) => { const r = await fetch('/api/private/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'include', body: JSON.stringify({ query: q, variables: v }) }); return r.json(); }, [query, variables]);
const short = r => r.errors ? 'REFUSED ' + (r.errors[0].extensions?.code || '') + ' ' + r.errors[0].message.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, '<id>').slice(0, 110) : 'ok';
const me = await gq('{ me { user { id email } } }');
if (me?.data?.me?.user?.email !== EMAIL) { console.error('not signed in as the requested user'); await browser.close(); process.exit(3); }
try { const steps = (await import(path.resolve(STEPS))).default; console.log(JSON.stringify(await steps({ gq, uid: me.data.me.user.id, args, short, page, BASE }), null, 1)); }
finally { await browser.close(); }
