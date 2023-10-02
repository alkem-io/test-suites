module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/notifications/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
