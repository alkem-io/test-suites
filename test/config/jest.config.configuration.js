module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/configuration/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
