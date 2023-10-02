module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/lookup/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
