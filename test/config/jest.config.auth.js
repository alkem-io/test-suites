module.exports = {
  ...require('./jest.config'),
  //testMatch: ['**/?(*.)+(it-spec).ts'],
  testRegex: ['/test/non-functional/auth/my-privileges/.*\\.it-spec\\.ts'],

  coverageDirectory: '<rootDir>/coverage-it',
};
