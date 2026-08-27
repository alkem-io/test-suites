// No taint (rule 1) anywhere here — this file trips a CONTENT rule (rule 5,
// renarrowed 040-parallel-nightly-server-api fifth pass): an exact, non-zero
// count asserted off the async `autoInvite` background flow, gated only by
// a fixed sleep — the real shape `move-L1-to-L2-auto-invite.it-spec.ts` and
// its two siblings use. Proves the narrowed pattern actually fires on this
// shape (and not on the old, now-neutralised, actor-scoped-aggregate shape
// it used to catch).
async function moveSpaceL1ToSpaceL2(sourceId: string, targetId: string, opts: { autoInvite: boolean }) {
  return { data: { moveSpaceL1ToSpaceL2: { id: targetId } } };
}
async function getCommunityApplicationsInvitations(roleSetId: string) {
  return { data: { lookup: { roleSet: { invitations: [{ id: '1' }, { id: '2' }, { id: '3' }] } } } };
}

test('asserts an exact non-zero count off the async autoInvite flow', async () => {
  await moveSpaceL1ToSpaceL2('source-id', 'target-id', { autoInvite: true });
  await new Promise(r => setTimeout(r, 1));

  const roleSetData = await getCommunityApplicationsInvitations('role-set-id');
  expect(roleSetData.data.lookup.roleSet.invitations).toHaveLength(3);
});
