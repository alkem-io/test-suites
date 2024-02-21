module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/lifecycle/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
