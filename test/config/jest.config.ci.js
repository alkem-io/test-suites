module.exports = {
  ...require('./jest.config'),
  // '**/?(*.)+(spec).ts',
  testRegex: ['/test/functional-api/.*\\/.*\\.it-spec.ts'],
  coverageDirectory: '<rootDir>/coverage-ci',
};
