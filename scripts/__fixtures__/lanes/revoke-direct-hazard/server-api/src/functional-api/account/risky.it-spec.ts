// The manifest file itself calls a REVOCATION directly — a plain static
// named import, no helper, no guard. Revocation is never convergent
// (rule 6 has no guard exemption at all), so this must be REJECTED
// regardless of any nearby-looking guard text.
import { removePlatformRole } from '../../hazard-symbols';

test('looks safe from here', async () => {
  await removePlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
  expect(1).toBe(1);
});
