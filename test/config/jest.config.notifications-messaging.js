module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/notifications/messaging/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
