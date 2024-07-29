module.exports = {
  ...require('./jest.config'),
  testRegex: [
    '/test/functional-api/organization/.*\\.it-spec\\.ts',
    '/test/functional-api/preferences/.*\\.it-spec\\.ts',
    '/test/functional-api/roles/.*\\.it-spec\\.ts',
    '/test/functional-api/lifecycle/.*\\.it-spec\\.ts',
    '/test/functional-api/user-management/.*\\.it-spec\\.ts',
    '/test/functional-api/callout/.*\\.it-spec\\.ts',
    '/test/functional-api/communications/.*\\.it-spec\\.ts',
    '/test/functional-api/activity-logs/.*\\.it-spec\\.ts',
    '/test/functional-api/storage/.*\\.it-spec\\.ts',
    '/test/functional-api/journey/.*\\.it-spec\\.ts',
    '/test/functional-api/notifications/callouts/.*\\.it-spec\\.ts',
    '/test/functional-api/notifications/messaging/.*\\.it-spec\\.ts',
    '/test/functional-api/notifications/community/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
