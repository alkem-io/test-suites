// No static import of any hazard symbol at all — reaches one only through a
// dynamic `await import(...)` with a destructured binding, which the old
// static-import-only regex (`import ... from '...'`) never produced an edge
// for.
test('looks safe from here', async () => {
  const { assignPlatformRole } = await import('../../hazard-symbols');
  await assignPlatformRole('space-id', 'user-id', 'GLOBAL_ADMIN');
  expect(1).toBe(1);
});
