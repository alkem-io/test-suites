module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/notifications/community/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
