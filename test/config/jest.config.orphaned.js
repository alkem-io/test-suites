module.exports = {
  ...require('./jest.config'),
  //testMatch: ['**/?(*.)+(it-spec).ts'],
  testRegex: ['/test/non-functional/orphaned-data/.*\\.it-spec\\.ts'],

  coverageDirectory: '<rootDir>/coverage-it',
};
