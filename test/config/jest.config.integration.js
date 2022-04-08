module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/integration/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
