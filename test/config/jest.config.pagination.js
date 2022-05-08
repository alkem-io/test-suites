module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/pagination/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
