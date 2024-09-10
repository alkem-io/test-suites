module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/account/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
