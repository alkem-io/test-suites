module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/callout/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
