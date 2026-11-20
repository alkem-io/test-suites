// 82-join-gained.mjs: steps file for 79-run-as-user.mjs. Takes two models of 73-access-model-export.py for the same user
// (before and after a repair), finds the role sets on which the user GAINED the right to join, and uses it: joins, checks
// the membership shows in the list and the credential sits on that space, then leaves again. Credentials must end as they started.
// A role set where the user is already a member is skipped (the first run of this file did not, and removed three real
// memberships of the experiment copy; they were put back by joining again).
// args: <db> <model before.json> <model after.json> [max, default 3]
import { execFileSync } from 'child_process';
import fs from 'fs';
export default async ({ gq, uid, args, short }) => {
  const [DB, BEFORE, AFTER, MAX = '3'] = args; if (!DB.startsWith('distill_')) throw new Error('experiment databases only');
  const psql = sql => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '|'], { input: sql }).toString().trim();
  const a = JSON.parse(fs.readFileSync(BEFORE)).objects.roleset, b = JSON.parse(fs.readFileSync(AFTER)).objects.roleset;
  const has = (m, id, p) => (m[id]?.[1] || '').split('+').includes(p);
  const gained = Object.keys(b).filter(id => has(b, id, 'ROLESET_ENTRY_ROLE_JOIN') && !has(a, id, 'ROLESET_ENTRY_ROLE_JOIN'));
  const finger = () => psql(`select count(*) || ' ' || md5(coalesce(string_agg(type||'@'||"resourceID", ',' order by type, "resourceID"),'')) from credential where "actorId"='${uid}'`);
  const start = finger(); const log = [];
  for (const rs of gained.slice(0, Number(MAX))) {
    const space = psql(`select s.id from community c join space s on s."communityId"=c.id where c."roleSetId"='${rs}'`);
    const e = { status0: (await gq('query($id:UUID!){ lookup { roleSet(ID:$id){ myMembershipStatus } } }', { id: rs })).data?.lookup?.roleSet?.myMembershipStatus };
    if (e.status0 === 'MEMBER') { e.skipped = 'already a member: leaving would remove a real membership'; log.push(e); continue; }
    e.join = short(await gq('mutation($d:JoinAsEntryRoleOnRoleSetInput!){ joinRoleSet(joinData:$d){ id } }', { d: { roleSetID: rs } }));
    const q = await gq('query($id:UUID!){ lookup { roleSet(ID:$id){ myMembershipStatus myRoles usersInRole(role:MEMBER){ id } } } }', { id: rs });
    e.status1 = q.data?.lookup?.roleSet?.myMembershipStatus; e.inList = q.data?.lookup?.roleSet?.usersInRole?.some(u => u.id === uid);
    e.credentialOnThatSpace = psql(`select count(*) from credential where "actorId"='${uid}' and type='space-member' and "resourceID"='${space}'`) === '1';
    e.leave = short(await gq('mutation($d:RemoveRoleOnRoleSetInput!){ removeRoleFromUser(roleData:$d){ id } }', { d: { actorID: uid, role: 'MEMBER', roleSetID: rs } }));
    log.push(e);
  }
  return { gainedJoinRights: gained.length, tried: log.length, log, credentialsBackToStart: finger() === start };
};
