// A fifth hazard shape (rule 9): a roleSet's member/lead/admin USER LIST
// read straight off a structural space conversion/move mutation's own
// response, compared against a before-conversion snapshot. The server's
// conversion service removes and re-assigns that same roleSet's role
// credentials as part of the structural move, so this read can observe the
// window before that settles — a window only wide enough to lose under
// concurrent host load. Content scan only (same family as rules 4/5/7/8);
// requires shared-user evidence in the same file.
import { TestUser } from '@alkemio/tests-lib';

async function convertSpaceL1ToSpaceL0(spaceID) {
  return { data: { convertSpaceL1ToSpaceL0: { community: { roleSet: { memberUsers: [] } } } } };
}

test('community roleSet members are preserved after conversion', async () => {
  const admins = [TestUser.SUBSPACE_ADMIN];
  const before = admins;
  const convertResult = await convertSpaceL1ToSpaceL0('fresh-space-id');
  const after = convertResult.data.convertSpaceL1ToSpaceL0.community.roleSet.memberUsers;
  expect(after).toEqual(before);
});
test('the serial complement', () => {
  expect(1).toBe(1);
});
