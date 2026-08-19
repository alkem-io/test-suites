// A fourth hazard shape (rule 8): a boolean assertion on whether a SHARED
// pool user is a MEMBER of a roleSet, via the `isUserMemberOfRoleSet` /
// `getRoleSetUsersInMemberRole` helper shape. The roleSet id itself can be
// file-owned and unique — that part is genuinely scoped — but the SUBJECT
// of the membership check is a shared identity reused by dozens of
// concurrent files, so a concurrent grant/removal targeting that same
// shared user elsewhere can flip the boolean regardless of how scoped the
// roleSet id looks. Empirically confirmed by
// join-hierarchy-parity.it-spec.ts failing under concurrency on exactly
// this shape (JOINER = TestUser.NON_SPACE_MEMBER) while passing serially —
// see server-api/html-report/{results,serial-confirm-raw}.json from the
// 2026-08-18 nightly run. Content scan only (same family as rules 4/5/7);
// requires shared-user evidence in the same file.
import { TestUserManager } from '@alkemio/tests-lib';

async function isUserMemberOfRoleSet(roleSetId, userId) {
  return false;
}

test('asserts a shared user is not a member of a freshly created roleSet', async () => {
  const isMember = await isUserMemberOfRoleSet(
    'fresh-role-set-id',
    TestUserManager.users.nonSpaceMember.id
  );
  expect(isMember).toBe(false);
});
test('the serial complement', () => {
  expect(1).toBe(1);
});
