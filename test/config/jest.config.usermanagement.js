module.exports = {
  ...require('./jest.config'),
  testMatch: [
    '**/?(*.)+(spec).ts',
    '<rootDir>/test/functional-api/user-management/**/?(*.)+(it-spec).ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
