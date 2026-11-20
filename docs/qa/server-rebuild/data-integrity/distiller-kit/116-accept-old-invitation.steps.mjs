// 116-accept-old-invitation.steps.mjs: can an OLD open invitation that has no invitee right still be accepted from the
// invitee's own list (open row 3, QA lead 2026-11-19)? Steps file for 79-run-as-user.mjs, run as the invited user.
// Steps: the user's own list of invitations, what they can open on the space before, ACCEPT, the state after, the
// memberships after (the space and the spaces above), what they can open after.
// WRITES through the application (accepts). Puts back by SQL what it changed, on the local experiment database only:
// the lifecycle row of the invitation as it was, and the credentials of the user that were not there before. Rows the
// accept wrote elsewhere (activity, notifications, stored policies) stay: 83-snapshot.sh diff shows them.
// args: <alkemio_db> <invitation id>. Prints counts and states only.
import { execFileSync } from 'child_process';
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', '\t'], { input: sql }).toString().trim();
export default async ({ gq, uid, args, short }) => {
  const [db, inv] = args; const out = {};
  const [space, parent, top, lifecycle] = psql(db, `SELECT s.id, coalesce(s."parentSpaceId"::text,''), s."levelZeroSpaceID", i."lifecycleId" FROM invitation i JOIN community cm ON cm."roleSetId"=i."roleSetId" JOIN space s ON s."communityId"=cm.id WHERE i.id='${inv}' AND i."invitedActorId"='${uid}'`).split('\t');
  if (!space) return { stop: 'this invitation is not for the signed-in user' };
  const credsBefore = new Set(psql(db, `SELECT id FROM credential WHERE "actorId"='${uid}'`).split('\n'));
  const stateBefore = psql(db, `SELECT coalesce(encode(convert_to("machineState"::text,'UTF8'),'base64'),'NULL') FROM lifecycle WHERE id='${lifecycle}'`);
  const open = async id => { const r = await gq(`{ lookup { x: space(ID:"${id}"){ authorization{ myPrivileges } } } }`); const c = await gq(`{ lookup { x: space(ID:"${id}"){ collaboration{ calloutsSet{ callouts{ id } } } } } }`);
    return (r.errors ? 'REFUSED' : (r.data.lookup.x.authorization?.myPrivileges || []).join(',') || '-') + ' | posts ' + (c.errors ? 'REFUSED' : 'listed ' + c.data.lookup.x.collaboration.calloutsSet.callouts.length); };
  const member = id => psql(db, `SELECT count(*) FROM credential WHERE "actorId"='${uid}' AND type='space-member' AND "resourceID"='${id}'`) === '1';
  const mine = async () => { const r = await gq(`{ me { communityInvitations { invitation { id state nextEvents } } } }`); const l = r.data?.me?.communityInvitations || []; const x = l.find(i => i.invitation.id === inv);
    return r.errors ? short(r) : `listed ${l.length}; this one: ${x ? 'state ' + x.invitation.state + ', next ' + x.invitation.nextEvents.join(',') : 'NOT in the list'}`; };
  out.own_list_before = await mine();
  out.can_open_space_before = await open(space);
  out.member_before = { space: member(space), parent: parent ? member(parent) : 'none', top: member(top) };
  const r = await gq(`mutation($d: InvitationEventInput!){ eventOnInvitation(eventData:$d){ id state nextEvents } }`, { d: { invitationID: inv, eventName: 'ACCEPT' } });
  out.accept = r.errors ? short(r) : 'ok, state ' + r.data.eventOnInvitation.state;
  await new Promise(f => setTimeout(f, 4000));
  out.state_in_database_after = psql(db, `SELECT coalesce("machineState"::jsonb->>'value','null') FROM lifecycle WHERE id='${lifecycle}'`);
  out.own_list_after = await mine();
  out.member_after = { space: member(space), parent: parent ? member(parent) : 'none', top: member(top) };
  out.invitee_right_after = psql(db, `SELECT count(*) FROM credential WHERE "actorId"='${uid}' AND type='space-invitee' AND "resourceID"='${space}'`);
  out.can_open_space_after = await open(space);
  out.can_open_top_after = await open(top);
  // put back
  const added = psql(db, `SELECT id, type FROM credential WHERE "actorId"='${uid}'`).split('\n').map(l => l.split('\t')).filter(([id]) => id && !credsBefore.has(id));
  out.credentials_added_by_the_accept = added.map(a => a[1]).sort().join(',') || 'none';
  if (added.length) psql(db, `DELETE FROM credential WHERE id IN (${added.map(a => `'${a[0]}'`).join(',')})`);
  psql(db, stateBefore === 'NULL' ? `UPDATE lifecycle SET "machineState"=NULL WHERE id='${lifecycle}'` : `UPDATE lifecycle SET "machineState"=convert_from(decode('${stateBefore}','base64'),'UTF8') WHERE id='${lifecycle}'`);
  out.put_back = { member_now: { space: member(space), top: member(top) }, state_now: psql(db, `SELECT coalesce("machineState"::jsonb->>'value','null (shown as invited)') FROM lifecycle WHERE id='${lifecycle}'`) };
  return out;
};
