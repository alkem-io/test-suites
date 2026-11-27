// 84-editors-check.mjs: steps file for 79-run-as-user.mjs. Run as an admin of a space. Creates a whiteboard callout and
// an office document callout, draws on the whiteboard and types in the office editor IN THE PAGE, and checks in the
// database that the stored body changed. Removes both callouts again. The runner (file 79) takes a backup first.
// args: <db> <space id> [--keep]      SHOT_DIR = where screenshots go (they show page content: local only)
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export default async ({ gq, args, short, page, BASE }) => {
  const [DB, SPACE] = args; const KEEP = args.includes('--keep'); const SHOTS = process.env.SHOT_DIR || '.';
  if (!DB.startsWith('distill_')) throw new Error('experiment databases only');
  const psql = sql => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '|'], { input: sql }).toString().trim();
  const out = {};
  const sp = (await gq('query($id:UUID!){ lookup { space(ID:$id){ id level about{ profile{ url } } collaboration{ calloutsSet{ id } } } } }', { id: SPACE })).data.lookup.space;
  out.spaceLevel = sp.level; const spacePath = new URL(sp.about.profile.url).pathname;
  const create = framing => gq('mutation($d:CreateCalloutOnCalloutsSetInput!){ createCalloutOnCalloutsSet(calloutData:$d){ id nameID framing{ type whiteboard{ id } collaboraDocument{ id } } } }',
    { d: { calloutsSetID: sp.collaboration.calloutsSet.id, sendNotification: false, framing } });
  const del = async (id, sql) => ({ delete: short(await gq('mutation($d:DeleteCalloutInput!){ deleteCallout(deleteData:$d){ id } }', { d: { ID: id } })), rowsLeftAfterDelete: psql(sql) });

  // 1. whiteboard: draw a rectangle
  { const c = await create({ type: 'WHITEBOARD', profile: { displayName: 'qa editors check whiteboard' }, whiteboard: { profile: { displayName: 'qa editors check whiteboard' } } });
    const o = out.whiteboard = { create: short(c) }; const co = c.data?.createCalloutOnCalloutsSet;
    if (co) { const wb = co.framing.whiteboard.id;
      const body = () => psql(`select f."externalID", f.size, w."contentVersion" from whiteboard w left join file f on f.id::text = w."contentPointer" where w.id='${wb}'`);
      const before = body(); o.bodyBefore = before.split('|').slice(1).join(' bytes, version ');
      try {
        await page.goto(BASE + spacePath + '/collaboration/' + co.nameID, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(7000);
        let canvas = page.locator('.excalidraw canvas.interactive, .excalidraw__canvas.interactive').first();
        if (!(await canvas.count())) { // open the board from the callout
          for (const loc of [page.getByRole('button', { name: /open whiteboard/i }).first()]) {
            if (await loc.count()) { await loc.click({ timeout: 5000 }).catch(() => { }); await page.waitForTimeout(6000); if (await canvas.count()) break; } } }
        o.canvasFound = await canvas.count() > 0;
        if (o.canvasFound) { const b = await canvas.boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
          await page.mouse.click(x, y); await page.keyboard.press('r'); await page.mouse.move(x - 120, y - 80); await page.mouse.down(); await page.mouse.move(x + 120, y + 80, { steps: 12 }); await page.mouse.up();
          await page.waitForTimeout(9000); await page.screenshot({ path: `${SHOTS}/84-whiteboard-drawn.png` });
          await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(6000); }
      } catch (e) { o.error = String(e).slice(0, 200); }
      await page.goto(BASE + '/robots.txt').catch(() => { }); await page.waitForTimeout(6000);
      const after = body(); o.bodyAfter = after.split('|').slice(1).join(' bytes, version ');
      o.storedBodyChanged = before.split('|')[0] !== after.split('|')[0]; o.storedBodyGrew = Number(after.split('|')[1]) > Number(before.split('|')[1]);
      if (!KEEP) Object.assign(o, await del(co.id, `select (select count(*) from callout where id='${co.id}') + (select count(*) from whiteboard where id='${wb}')`)); } }

  // 2. office document: type text
  { const c = await create({ type: 'COLLABORA_DOCUMENT', profile: { displayName: 'qa editors check document' }, collaboraDocument: { displayName: 'qa editors check document', documentType: 'WORDPROCESSING' } });
    const o = out.officeDocument = { create: short(c) }; const co = c.data?.createCalloutOnCalloutsSet;
    if (co) { const doc = co.framing.collaboraDocument.id;
      const body = () => psql(`select f."externalID", f.size, f."mimeType" from collabora_document d left join file f on f.id = d."documentId" where d.id='${doc}'`);
      const before = body(); o.bodyBefore = before.split('|').slice(1).join(' bytes, ');
      const ed = await gq('query($id:UUID!){ collaboraEditorUrl(collaboraDocumentID:$id){ editorUrl } }', { id: doc }); o.editorAddress = ed.errors ? short(ed) : 'given';
      try {
        await page.goto(BASE + spacePath + '/collaboration/' + co.nameID, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(8000);
        let frameEl = page.locator('iframe').first();
        if (!(await frameEl.count())) { const opener = page.getByRole('button', { name: /open document|open/i }).first(); if (await opener.count()) { await opener.click().catch(() => { }); await page.waitForTimeout(8000); } }
        o.editorFrameFound = await frameEl.count() > 0;
        if (o.editorFrameFound) { await page.waitForTimeout(12000); const b = await frameEl.boundingBox();
          // the editor shows a welcome panel on first use: close it, in whichever frame it lives
          let closed = 0; for (const f of page.frames()) { const x = f.locator('.iframe-dialog-close, .iframe-welcome-close, .ui-dialog-titlebar-close, [aria-label="Close dialog"], [aria-label="Close"]');
            const n = await x.count().catch(() => 0); for (let i = 0; i < n; i++) if (f !== page.mainFrame() && await x.nth(i).isVisible().catch(() => false)) { await x.nth(i).click().catch(() => { }); closed++; } }
          if (!closed) { // not reachable by selector: its close cross sits at the top right of the panel in the middle of the frame
            await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.55); await page.keyboard.press('Escape'); await page.waitForTimeout(1000);
            await page.mouse.click(b.x + 1035, b.y + 176); closed = 'by position'; }
          o.welcomePanelClosed = closed; await page.waitForTimeout(2000); await page.screenshot({ path: `${SHOTS}/84-office-open.png` });
          await page.mouse.click(b.x + b.width * 0.35, b.y + b.height * 0.45); await page.waitForTimeout(1500);
          await page.keyboard.type('typed by the editors check', { delay: 40 }); await page.waitForTimeout(2000);
          await page.keyboard.press('Control+s'); await page.waitForTimeout(8000); await page.screenshot({ path: `${SHOTS}/84-office-typed.png` });
          await page.keyboard.press('Escape'); await page.waitForTimeout(3000); }
      } catch (e) { o.error = String(e).slice(0, 200); }
      await page.goto(BASE + '/robots.txt').catch(() => { });
      let after = before; for (let i = 0; i < 12 && after.split('|')[0] === before.split('|')[0]; i++) { await page.waitForTimeout(5000); after = body(); }
      o.bodyAfter = after.split('|').slice(1).join(' bytes, ');
      o.storedBodyChanged = before.split('|')[0] !== after.split('|')[0]; o.storedBodyGrew = Number(after.split('|')[1]) > Number(before.split('|')[1]);
      if (!KEEP) Object.assign(o, await del(co.id, `select (select count(*) from callout where id='${co.id}') + (select count(*) from collabora_document where id='${doc}')`)); } }
  return out;
};
