// 124-new-subspace-visibility.steps.mjs: does a NEW subspace get the visibility of its top-level space (row 6, 2026-11-20)?
// As an admin of a top-level space that is NOT active: create a subspace, read the visibility the server stored for it
// and for the top-level space, then delete the subspace.
// Steps file for 79-run-as-user.mjs. args: <alkemio_db> <top-level space id>. Local stack only. Prints values and counts only.
import { execFileSync } from 'child_process';
const psql = (db, sql) => execFileSync('docker', ['exec', '-i', 'alkemio_dev_postgres', 'psql', '-U', 'synapse', '-d', db, '-X', '-q', '-At'], { input: sql }).toString().trim();
export default async ({ gq, args, short }) => {
  const [db, spaceID] = args; const out = {};
  out.top_level_visibility = psql(db, `SELECT visibility FROM space WHERE id='${spaceID}' AND level=0`);
  const r = await gq(`mutation($d: CreateSubspaceInput!){ createSubspace(subspaceData:$d){ id level visibility } }`,
    { d: { spaceID, about: { profileData: { displayName: 'QA 124 new subspace visibility' } }, collaborationData: { calloutsSetData: {} } } });
  out.create = short(r); const sub = r.data?.createSubspace; if (!sub) return out;
  out.new_subspace_visibility_answered = sub.visibility; out.new_subspace_visibility_stored = psql(db, `SELECT visibility FROM space WHERE id='${sub.id}'`);
  out.same_as_top_level = out.new_subspace_visibility_stored === out.top_level_visibility;
  out.cleanup = short(await gq(`mutation($d: DeleteSpaceInput!){ deleteSpace(deleteData:$d){ id } }`, { d: { ID: sub.id } }));
  out.left_behind = psql(db, `SELECT count(*) FROM space WHERE id='${sub.id}'`);
  return out;
};
