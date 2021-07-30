module.exports = {
  moduleNameMapper: {
    '@test/(.*)': ['<rootDir>/test/$1'],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['./test/setupTests.ts'],
  rootDir: '../../',
  roots: ['<rootDir>/test'],
  testMatch: ['**/?(*.)+(spec).ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage',
  testEnvironment: 'node',
  collectCoverageFrom: [],
  testTimeout: 90000,
  collectCoverage: false,
};
