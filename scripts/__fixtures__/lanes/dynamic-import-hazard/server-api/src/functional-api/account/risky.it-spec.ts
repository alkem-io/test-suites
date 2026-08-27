// No static import of any hazard symbol at all — reaches one only through a
// dynamic `await import(...)` with a destructured binding, which the old
// static-import-only regex (`import ... from '...'`) never produced an edge
// for.
test('looks safe from here', async () => {
  const { getMails } = await import('../../hazard-symbols');
  await getMails();
  expect(1).toBe(1);
});
