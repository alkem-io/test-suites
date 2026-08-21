// BUG: xdescribe suite disabled pending a fix — #4242
xdescribe('a jest-compat disabled suite', () => {
  test('inner test', () => {
    expect(1).toBe(1);
  });
});

xit('an undocumented jest-compat disabled test', () => {
  expect(1).toBe(1);
});
