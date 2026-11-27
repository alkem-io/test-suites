// 104-template-subspace.steps.mjs: reproduce the short parent lists (register A3 remainder, 2026-11-19).
// As an admin of a top-level space: create a subspace from a space template whose content has child spaces, read the
// parent lists the server wrote for the new subspace and its children, then delete what was created (children first).
// Steps file for 79-run-as-user.mjs. args: <alkemio_db> <top-level space id> <space template id>. Local stack only.
// Prints counts and list lengths only.
import { execFileSync } from 'child_process';
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At', '-F', ' | '], { input: sql }).toString().trim().split('\n');
export default async ({ gq, args, short }) => {
  const [db, spaceID, templateID] = args; const out = {};
  const r = await gq(`mutation($d: CreateSubspaceInput!){ createSubspace(subspaceData:$d){ id level subspaces{ id level } } }`,
    { d: { spaceID, spaceTemplateID: templateID, about: { profileData: { displayName: 'QA 104 template subspace' } }, collaborationData: { calloutsSetData: {} } } });
  out.create = short(r); const sub = r.data?.createSubspace; if (!sub) return out;
  const kids = (sub.subspaces || []).map(k => k.id); out.children_created = kids.length;
  const ids = [sub.id, ...kids].map(i => `'${i}'`).join(',');
  out.lists = psql(db, `SELECT 'level ' || s.level, r.name, 'entries ' || jsonb_array_length(r."parentCredentials"),
     'names parent ' || EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") e WHERE e->>'resourceID'=s."parentSpaceId"::text),
     'names top ' || EXISTS (SELECT 1 FROM jsonb_array_elements(r."parentCredentials") e WHERE e->>'resourceID'=s."levelZeroSpaceID"::text AND s."levelZeroSpaceID"<>s."parentSpaceId")
     FROM space s JOIN community c ON c.id=s."communityId" JOIN role r ON r."roleSetId"=c."roleSetId" WHERE s.id IN (${ids}) ORDER BY s.level, r.name`);
  out.policy_rule_for_contributors = psql(db, `SELECT 'level ' || s.level, 'top-level members named in the contribute rule of the collaboration: ' ||
     EXISTS (SELECT 1 FROM collaboration co JOIN authorization_policy p ON p.id=co."authorizationId" CROSS JOIN LATERAL jsonb_array_elements(p."credentialRules"::jsonb) ru CROSS JOIN LATERAL jsonb_array_elements(ru->'criterias') cr
             WHERE co.id=s."collaborationId" AND ru->'grantedPrivileges' ? 'contribute' AND cr->>'type'='space-member' AND cr->>'resourceID'=s."levelZeroSpaceID"::text)
     FROM space s WHERE s.id IN (${ids}) ORDER BY s.level`);
  out.cleanup = [];
  for (const id of [...kids, sub.id]) out.cleanup.push(short(await gq(`mutation($d: DeleteSpaceInput!){ deleteSpace(deleteData:$d){ id } }`, { d: { ID: id } })));
  out.left_behind = psql(db, `SELECT count(*) FROM space WHERE id IN (${ids})`)[0];
  return out;
};
