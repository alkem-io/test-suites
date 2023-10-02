module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/organization/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
