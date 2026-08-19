// No mutation at all here — the hazard is a READ: an assertion on a shared
// pool user's platform-role membership (exact absence/presence), which a
// concurrent grant elsewhere could flip regardless of how sound rule 2's
// taint analysis is. Rule 7 (content scan, same family as 4/5) exists for
// exactly this shape.
import { TestUserManager } from '@alkemio/tests-lib';

test('asserts a shared user does not have a role yet', async () => {
  const user = TestUserManager.users.betaTester;
  expect(user.RoleNames).not.toContain('GLOBAL_SUPPORT');
});
