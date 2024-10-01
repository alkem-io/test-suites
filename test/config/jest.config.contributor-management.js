module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/contributor-management/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
