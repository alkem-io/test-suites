module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/preferences/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
