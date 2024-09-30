module.exports = {
  ...require('./jest.config'),
  testRegex: [
    '/test/functional-api/templates/innovation-flow/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
