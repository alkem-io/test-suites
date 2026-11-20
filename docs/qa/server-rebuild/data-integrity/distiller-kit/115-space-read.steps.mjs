// 115-space-read.steps.mjs: what the signed-in user may read on one space. Steps file for 79-run-as-user.mjs. Reads only.
// args: <space id>. Each part is asked on its own. Used to show a read before and after a repair (first use: repair 110).
export default async ({ gq, args }) => { const out = {};
  const parts = { space: 'authorization{ myPrivileges }', about: 'about{ authorization{ myPrivileges } }', community: 'community{ authorization{ myPrivileges } }', collaboration: 'collaboration{ authorization{ myPrivileges } }', posts: 'collaboration{ calloutsSet{ callouts{ id } } }' };
  for (const [k, p] of Object.entries(parts)) { const r = await gq(`{ lookup { x: space(ID:"${args[0]}"){ ${p} } } }`); const x = r.data?.lookup?.x;
    out[k] = r.errors ? 'REFUSED' : k === 'posts' ? 'listed ' + x.collaboration.calloutsSet.callouts.length : ((k === 'space' ? x : x[k])?.authorization?.myPrivileges || []).join(',') || '-'; }
  return out; };
