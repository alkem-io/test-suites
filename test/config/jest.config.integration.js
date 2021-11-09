module.exports = {
  ...require('./jest.config'),
  testMatch: [
    '**/?(*.)+(spec).ts',
    '<rootDir>/test/functional-api/integration/**/?(*.)+(it-spec).ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
