// A sixth hazard shape (rule 10): a DDT table that asserts a privileged
// mutation SUCCEEDS for a shared pool user, via the
// `${TestUser.X} | ${'"data":{"someMutation"'}` message-column idiom. The
// server's actor-authorization cache is keyed only by actor ID, not by
// (actor, resource), so it can be transiently stale for that shared
// identity whenever ANY concurrent file changes one of that same
// identity's credentials anywhere on the platform. Content scan only
// (same family as rules 4/5/7/8/9); requires shared-user evidence in the
// same file.
import { TestUser } from '@alkemio/tests-lib';

async function updateWidget(id, userRole) {
  return JSON.stringify({ error: { errors: [{ message: 'Authorization: denied' }] } });
}

describe('DDT user privileges to update widget', () => {
  test.each`
    userRole                     | message
    ${TestUser.SUBSPACE_ADMIN}   | ${'"data":{"updateWidget"'}
    ${TestUser.NON_SPACE_MEMBER} | ${'errors'}
  `(
    'User: "$userRole" get message: "$message", who intend to update widget',
    async ({ userRole, message }) => {
      const res = await updateWidget('widget-id', userRole);
      expect(res).toContain(message);
    }
  );
});
test('the serial complement', () => {
  expect(1).toBe(1);
});
