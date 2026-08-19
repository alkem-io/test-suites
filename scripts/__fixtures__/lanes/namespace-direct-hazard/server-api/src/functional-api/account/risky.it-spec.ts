// The manifest spec file itself calls the hazard symbol via a NAMESPACE
// import — no helper at all. The old `fileImportsName` excluded namespace
// edges outright, so even this direct, zero-hop call was invisible to the
// guard.
import * as hz from '../../hazard-symbols';

test('looks safe from here', async () => {
  await hz.assignPlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
  expect(1).toBe(1);
});
