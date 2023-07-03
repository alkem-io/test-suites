module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/integration/documents/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
