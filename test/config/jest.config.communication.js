module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/communications/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
