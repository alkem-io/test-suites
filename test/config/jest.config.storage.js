module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/storage/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
