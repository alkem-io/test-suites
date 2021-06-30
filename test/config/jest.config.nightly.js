module.exports = {
  ...require('./jest.config'),
  testMatch: ['**/?(*.)+(spec).ts', '**/?(*.)+(it-spec).ts'],
  coverageDirectory: '<rootDir>/coverage-nightly',
};
