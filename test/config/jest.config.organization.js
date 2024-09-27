module.exports = {
  ...require('./jest.config'),
  testRegex: [
    '/test/functional-api/contributor-management/organization/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
