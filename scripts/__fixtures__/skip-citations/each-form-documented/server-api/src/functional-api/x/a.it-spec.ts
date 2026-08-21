describe('a suite', () => {
  // skip until bug is fixed: https://github.com/alkem-io/server/issues/8888
  test.skip.each`
    role       | expected
    ${'admin'} | ${2}
    ${'member'}| ${0}
  `('$role sees $expected results', ({ role, expected }) => {
    expect(role).toBeDefined();
    expect(expected).toBeDefined();
  });
});
