module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/notifications/callouts/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
