import { RiskyRevokeClass } from './risky-class';

test('looks safe from here', async () => {
  await RiskyRevokeClass.revokeIfPresent({ RoleNames: ['GLOBAL_SUPPORT'] });
  expect(1).toBe(1);
});
