// Same hazard family as rule 5 (a global aggregate keyed on a shared
// identity) but reached through the repo's OWN wrapper function name for the
// GraphQL operation that lists a role-set's pending applications and
// invites — capitalized, since it starts with a verb prefix — rather than a
// literal lowercase field access. The pre-fix rule 5 pattern was
// case-SENSITIVE and required a lowercase leading letter, so this exact,
// real-repo call shape went undetected: move-L1-to-L2-auto-invite.it-spec.ts
// called this wrapper, asserted an exact invitation count over a shared-pool
// overlap set, and failed under concurrency (interference, not a
// pre-existing defect) while the guard had certified it parallel-safe — see
// server-api/html-report/{results,serial-confirm-raw}.json from the
// 2026-08-18 nightly run. Proves the case-insensitive (`i` flag) fix
// actually fires on this shape.
async function getCommunityApplicationsInvitations(roleSetId) {
  return { data: { lookup: { roleSet: { invitations: [] } } } };
}

test('reads a pending-invitations aggregate through a capitalized wrapper name', async () => {
  const res = await getCommunityApplicationsInvitations('some-role-set-id');
  expect(res.data.lookup.roleSet.invitations).toHaveLength(3);
});
test('the serial complement', () => {
  expect(1).toBe(1);
});
