module.exports = {
  ...require('./jest.config'),
  /*testMatch: [
    '**!/?(*.)+(spec).ts',
    '**!/test/functional-api/integration/!**!/.*\\.it-spec\\.ts',
  ],*/
  testRegex: ['/test/functional-api/integration/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
