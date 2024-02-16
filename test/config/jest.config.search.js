module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/search/.*\\.it-spec\\.ts'],
  // coverageDirectory: '<rootDir>/coverage-ci',
};
