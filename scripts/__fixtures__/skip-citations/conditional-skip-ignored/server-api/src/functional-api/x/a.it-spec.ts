const isCI = process.env.CI === 'true';

describe('a suite', () => {
  test.skipIf(isCI)('should be skipped only in CI', () => {
    expect(1).toBe(1);
  });

  test('data-driven skip inside a test body', async ctx => {
    if (!process.env.OPTIONAL_FEATURE_FLAG) {
      ctx.skip('optional feature not configured — nothing to assert');
    }
    expect(1).toBe(1);
  });
});
