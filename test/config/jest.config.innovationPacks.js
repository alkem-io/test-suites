module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/innovation-pack/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
