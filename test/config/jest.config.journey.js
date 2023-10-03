module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/journey/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
