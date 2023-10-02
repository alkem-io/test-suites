module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/callouts/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
