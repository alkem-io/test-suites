module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/innovation-hub/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
