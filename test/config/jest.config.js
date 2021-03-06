module.exports = {
  moduleNameMapper: {
    '@test/(.*)': ['<rootDir>/test/$1'],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['./test/setupTests.ts'],
  rootDir: '../../',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  collectCoverageFrom: [],
  testTimeout: 190000,
  collectCoverage: false,
  globalSetup: '<rootDir>/test/testSetup.ts',
};
