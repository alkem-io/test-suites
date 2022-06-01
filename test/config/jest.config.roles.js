module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/roles/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
