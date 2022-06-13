module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/subscriptions/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
