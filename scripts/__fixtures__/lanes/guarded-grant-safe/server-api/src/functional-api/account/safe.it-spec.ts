// Grant-only convergent setup, reached through a static class method (the
// same shape as A/class-hazard, but WITH the already-has-it guard nearby).
// Must be ACCEPTED into the parallel lane — the guard must exit 0.
import { SafeGrantClass } from './safe-class';

test('grant-only convergent setup is not a hazard', async () => {
  await SafeGrantClass.grantIfMissing({ RoleNames: [] });
  expect(1).toBe(1);
});
