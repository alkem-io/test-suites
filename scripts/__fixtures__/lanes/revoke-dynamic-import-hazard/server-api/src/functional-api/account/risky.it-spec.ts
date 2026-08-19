// Revocation reached through a dynamic `await import(...)` with a
// destructured binding. Must be REJECTED — rule 6 has no guard exemption.
test('looks safe from here', async () => {
  const { removePlatformRole } = await import('../../hazard-symbols');
  await removePlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
  expect(1).toBe(1);
});
