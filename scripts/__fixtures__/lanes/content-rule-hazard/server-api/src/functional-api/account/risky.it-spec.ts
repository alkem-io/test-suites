// No taint (rules 1-3) anywhere here — this file trips a CONTENT rule
// (rule 5): a global aggregate keyed on a shared identity, asserted by
// count. Proves rule 5 actually fires on the field-name shape it claims to
// detect (qual-test-suites-4: this class of rule previously had no
// self-test at all — a typo'd or narrowed pattern would have gone
// undetected).
test('asserts an exact count over a shared-identity aggregate', async () => {
  const res = { data: { communityApplications: [{ id: '1' }, { id: '2' }] } };
  expect(res.data.communityApplications.length).toBe(2);
});
