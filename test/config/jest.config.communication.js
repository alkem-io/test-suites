module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/communication/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
