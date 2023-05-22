module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/upload/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
