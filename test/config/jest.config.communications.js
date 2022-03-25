module.exports = {
  ...require('./jest.config'),
  /*testMatch: [
    '**!/?(*.)+(spec).ts',
    '<rootDir>/test/functional-api/zcommunications/!**!/?(*.)+(it-spec).ts',
  ],*/
  testRegex: ['/test/functional-api/zcommunications/.*\\.it-spec\\.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
