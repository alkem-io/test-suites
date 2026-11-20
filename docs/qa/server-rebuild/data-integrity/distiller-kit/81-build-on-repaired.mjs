// 81-build-on-repaired.mjs: steps file for 79-run-as-user.mjs. Run as an admin of a space whose role definitions were
// repaired (C8). Builds new things on top of it and removes them again:
//   1. a subspace: its three role definitions must name the new subspace itself, and their parent entries must name the
//      repaired space (and the spaces above it), read from the database;
//   2. a memo callout: created, read back, live editing connection served, a comment sent and removed, then deleted;
//   3. with --type: the memo is opened in the page and text is typed; the stored text must hold it after a reload.
// args: <db> <space id> [--type]
import { execFileSync } from 'child_process';
export default async ({ gq, args, short, page, BASE }) => {
  const [DB, SPACE] = args; const TYPE = args.includes('--type');
  if (!DB.startsWith('distill_')) throw new Error('experiment databases only');
  const psql = sql => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '|'], { input: sql }).toString().trim();
  const out = {};
  const sp = (await gq('query($id:UUID!){ lookup { space(ID:$id){ id level about{ profile{ url } } collaboration{ calloutsSet{ id } innovationFlow{ currentState{ displayName } } } subspaces{ id } } } }', { id: SPACE })).data.lookup.space;
  const chain = psql(`with recursive up as (select id, "parentSpaceId" from space where id='${SPACE}' union all select s.id, s."parentSpaceId" from space s join up on s.id=up."parentSpaceId") select id from up`).split('\n');
  // 1. subspace
  if (sp.level !== 'L2') {
    const c = await gq('mutation($d:CreateSubspaceInput!){ createSubspace(subspaceData:$d){ id nameID community{ roleSet{ id roleDefinitions{ name credential{ type resourceID } parentCredentials{ type resourceID } } } } } }',
      { d: { spaceID: SPACE, about: { profileData: { displayName: 'qa walk check subspace' } }, collaborationData: { calloutsSetData: {} } } });
    out.subspace = { create: short(c) }; const n = c.data?.createSubspace;
    if (n) {
      const defs = n.community.roleSet.roleDefinitions;
      out.subspace.roleDefinitions = defs.length; out.subspace.allNameTheNewSpace = defs.every(d => d.credential.resourceID === n.id);
      out.subspace.parentEntriesAllInTheChain = defs.every(d => d.parentCredentials.length > 0 && d.parentCredentials.every(p => chain.includes(p.resourceID)));
      out.subspace.parentEntriesNameTheRepairedSpace = defs.every(d => d.parentCredentials.some(p => p.resourceID === SPACE));
      out.subspace.creatorCredentials = psql(`select string_agg(type, ',' order by type) from credential where "resourceID"='${n.id}'`);
      out.subspace.creatorSubspaceAdminOnParent = psql(`select count(*) from credential c join "user" u on u.id=c."actorId" where c.type='space-subspace-admin' and c."resourceID"='${SPACE}'`);
      out.subspace.listedUnderParent = (await gq('query($id:UUID!){ lookup { space(ID:$id){ subspaces{ id } } } }', { id: SPACE })).data.lookup.space.subspaces.some(s => s.id === n.id);
      out.subspace.delete = short(await gq('mutation($d:DeleteSpaceInput!){ deleteSpace(deleteData:$d){ id } }', { d: { ID: n.id } }));
      out.subspace.rowsLeftAfterDelete = psql(`select (select count(*) from space where id='${n.id}') + (select count(*) from credential where "resourceID"='${n.id}')`);
    }
  }
  // 2. memo callout
  const cc = await gq('mutation($d:CreateCalloutOnCalloutsSetInput!){ createCalloutOnCalloutsSet(calloutData:$d){ id nameID framing{ type memo{ id } } comments{ id } classification{ tagsets{ name tags } } } }',
    { d: { calloutsSetID: sp.collaboration.calloutsSet.id, sendNotification: false, framing: { type: 'MEMO', profile: { displayName: 'qa walk check memo' }, memo: { markdown: 'start text', profile: { displayName: 'qa walk check memo' } } } } });
  out.callout = { create: short(cc) }; const co = cc.data?.createCalloutOnCalloutsSet;
  if (co) {
    const memo = co.framing.memo.id;
    out.callout.onCurrentPhase = co.classification.tagsets.find(t => t.name === 'flow-state')?.tags?.[0] === sp.collaboration.innovationFlow.currentState.displayName;
    out.callout.memoRead = (await gq('query($id:UUID!){ lookup { memo(ID:$id){ markdown authorization{ myPrivileges } } } }', { id: memo })).data?.lookup?.memo?.markdown?.includes('start text');
    out.callout.liveConnection = await page.evaluate(id => new Promise(done => { const ws = new WebSocket(`${location.origin.replace('http', 'ws')}/collab/${id}?type=memo`); ws.onmessage = () => { ws.close(); done('served'); }; ws.onclose = e => done('closed ' + e.code); setTimeout(() => done('timeout'), 8000); }), memo);
    if (co.comments) { const s = await gq('mutation($d:RoomSendMessageInput!){ sendMessageToRoom(messageData:$d){ id } }', { d: { roomID: co.comments.id, message: 'qa walk check' } }); out.callout.comment = short(s);
      if (s.data) out.callout.commentRemove = short(await gq('mutation($d:RoomRemoveMessageInput!){ removeMessageOnRoom(messageData:$d) }', { d: { roomID: co.comments.id, messageID: s.data.sendMessageToRoom.id } })); }
    if (TYPE) { try {
      await page.goto(BASE + new URL(sp.about.profile.url).pathname + '/collaboration/' + co.nameID, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(6000);
      await page.screenshot({ path: `${process.env.SHOT_DIR || '.'}/81-callout.png` });
      const opener = page.getByRole('button', { name: /memo|open|edit/i }).first(); if (await opener.count()) await opener.click().catch(() => { });
      await page.waitForTimeout(4000); const ed = page.locator('[contenteditable=true]').last();
      out.callout.editorFound = await ed.count() > 0;
      if (out.callout.editorFound) { await ed.click(); await page.keyboard.press('End'); await page.keyboard.type(' typed by the walk'); await page.waitForTimeout(5000); await page.screenshot({ path: `${process.env.SHOT_DIR || '.'}/81-typed.png` }); await page.keyboard.press('Escape'); await page.waitForTimeout(4000); }
      await page.goto(BASE + '/robots.txt').catch(() => { }); await page.waitForTimeout(3000);
      out.callout.typedTextStored = !!(await gq('query($id:UUID!){ lookup { memo(ID:$id){ markdown } } }', { id: memo })).data?.lookup?.memo?.markdown?.includes('typed by the walk');
    } catch (e) { out.callout.typeError = String(e).slice(0, 160); } }
    out.callout.delete = short(await gq('mutation($d:DeleteCalloutInput!){ deleteCallout(deleteData:$d){ id } }', { d: { ID: co.id } }));
    out.callout.rowsLeftAfterDelete = psql(`select (select count(*) from callout where id='${co.id}') + (select count(*) from memo where id='${memo}')`);
  }
  return out;
};
