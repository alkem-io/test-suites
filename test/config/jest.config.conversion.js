module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/conversions/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
