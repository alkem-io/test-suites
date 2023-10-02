module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/platform/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
