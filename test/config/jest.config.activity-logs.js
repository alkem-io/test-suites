module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/activity-logs/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
