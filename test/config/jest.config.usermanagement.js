module.exports = {
  ...require('./jest.config'),
  /*testMatch: [
    '**!/?(*.)+(spec).ts',
    '**!/test/functional-api/user-management/!**',
  ],*/
  testRegex: ['/test/functional-api/user-management/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
