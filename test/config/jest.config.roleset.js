module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/roleset/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
