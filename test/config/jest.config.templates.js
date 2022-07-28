module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/templates/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
