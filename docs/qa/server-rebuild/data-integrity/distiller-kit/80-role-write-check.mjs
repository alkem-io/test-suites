// 80-role-write-check.mjs: steps file for 79-run-as-user.mjs. Run as an admin of a space chain L0 > L1 > L2 whose L1 and L2
// role definitions were repaired (C8). Two phases, because entry to a top-level space goes by invitation:
//   invite : invites the subject user to the repaired L1 (the subject is in no space of the chain, so the invitation must
//            carry "also to the parent"). The subject then accepts in their own session (eventOnInvitation ACCEPT).
//   roles  : gives the subject lead and admin on L1 and member, lead, admin on L2, checks after every step where the
//            credentials landed in the database, takes every role away again, deletes the invitation and checks that the
//            subject's credentials equal the fingerprint given.
// args: invite <db> <subject id> <L0> <L1> <L2>   |   roles <db> <subject id> <L0> <L1> <L2> <invitation id> <start fingerprint>
import { execFileSync } from 'child_process';
export default async ({ gq, args, short }) => {
  const [PHASE, DB, SUBJ, S0, S1, S2, INV, START] = args;
  if (!DB.startsWith('distill_')) throw new Error('experiment databases only');
  const psql = sql => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', DB, '-X', '-q', '-At', '-F', '|'], { input: sql }).toString().trim();
  const name = { [S0]: 'L0', [S1]: 'L1', [S2]: 'L2' };
  const creds = () => psql(`select type, "resourceID" from credential where "actorId"='${SUBJ}' and "resourceID" in ('${S0}','${S1}','${S2}') order by 2,1`).split('\n').filter(Boolean).map(l => { const [t, r] = l.split('|'); return `${t}@${name[r]}`; }).join(', ');
  const finger = () => psql(`select count(*) || ' ' || md5(coalesce(string_agg(type||'@'||"resourceID", ',' order by type, "resourceID"),'')) from credential where "actorId"='${SUBJ}'`);
  const rs = {}; for (const s of [S0, S1, S2]) rs[s] = (await gq('query($id:UUID!){ lookup { space(ID:$id){ community{ roleSet{ id } } } } }', { id: s })).data.lookup.space.community.roleSet.id;
  const inRole = async (s, role) => { const r = await gq(`query($id:UUID!){ lookup { roleSet(ID:$id){ usersInRole(role:${role}){ id } } } }`, { id: rs[s] }); return r.data?.lookup?.roleSet?.usersInRole?.some(u => u.id === SUBJ); };
  const A = async (s, role) => short(await gq('mutation($d:AssignRoleOnRoleSetInput!){ assignRoleToUser(roleData:$d){ id } }', { d: { actorID: SUBJ, role, roleSetID: rs[s] } }));
  const X = async (s, role) => short(await gq('mutation($d:RemoveRoleOnRoleSetInput!){ removeRoleFromUser(roleData:$d){ id } }', { d: { actorID: SUBJ, role, roleSetID: rs[s] } }));
  const log = []; const step = async (what, fn, list) => { const r = await fn(); log.push({ step: what, result: r, credentials: creds(), ...(list ? { shownInList: await inRole(...list) } : {}) }); };
  if (PHASE === 'invite') {
    const start = finger(); log.push({ step: 'start', credentials: creds() });
    await step('L1 member with no L0 membership (must be refused)', () => A(S1, 'MEMBER'));
    const r = await gq('mutation($d:InviteForEntryRoleOnRoleSetInput!){ inviteForEntryRoleOnRoleSet(invitationData:$d){ type invitation{ id invitedToParent state } } }', { d: { roleSetID: rs[S1], invitedActorIDs: [SUBJ], invitedUserEmails: [], extraRoles: [], welcomeMessage: 'qa walk check' } });
    const inv = r.data?.inviteForEntryRoleOnRoleSet?.[0];
    log.push({ step: 'invite to L1', result: short(r), type: inv?.type, invitedToParent: inv?.invitation?.invitedToParent, state: inv?.invitation?.state, credentials: creds() });
    return { log, invitation: inv?.invitation?.id, startFingerprint: start };
  }
  log.push({ step: 'after the subject accepted', credentials: creds(), inL0Members: await inRole(S0, 'MEMBER'), inL1Members: await inRole(S1, 'MEMBER') });
  await step('L1 lead', () => A(S1, 'LEAD'), [S1, 'LEAD']);
  await step('L1 admin', () => A(S1, 'ADMIN'), [S1, 'ADMIN']);
  await step('L2 member', () => A(S2, 'MEMBER'), [S2, 'MEMBER']);
  await step('L2 lead', () => A(S2, 'LEAD'), [S2, 'LEAD']);
  await step('L2 admin', () => A(S2, 'ADMIN'), [S2, 'ADMIN']);
  for (const [s, role] of [[S2, 'ADMIN'], [S2, 'LEAD'], [S2, 'MEMBER'], [S1, 'ADMIN'], [S1, 'LEAD'], [S1, 'MEMBER'], [S0, 'MEMBER']]) await step(`remove ${name[s]} ${role.toLowerCase()}`, () => X(s, role));
  if (INV) log.push({ step: 'delete the invitation', result: short(await gq('mutation($d:DeleteInvitationInput!){ deleteInvitation(deleteData:$d){ id } }', { d: { ID: INV } })) });
  return { log, subjectCredentialsBackToStart: finger() === START, fingerprintNow: finger() };
};
