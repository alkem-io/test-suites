module.exports = {
  ...require('./jest.config'),
  testRegex: ['/test/functional-api/zcommunications/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
