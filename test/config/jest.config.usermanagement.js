module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/user-management/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
