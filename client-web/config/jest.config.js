const { compilerOptions } = require('../tsconfig');

module.exports = {
  rootDir: '..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@generated/(.*)$': '<rootDir>/test/generated/$1',
    '^@utils/(.*)$': '<rootDir>/test/utils/$1',
    '^@functional-api/(.*)$': '<rootDir>/test/functional-api/$1',
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFiles: ['./src/setupTests.ts'],
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [],
  testTimeout: 90000,
  collectCoverage: false,
  globalSetup: '<rootDir>/src/testSetup.ts',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './html-report',
        filename: `report${new Date().getDay()}_${new Date().getMonth()}_${new Date().getFullYear()}_${new Date().getHours()}_${new Date().getMinutes()}_${new Date().getSeconds()}_${new Date().getMilliseconds()}.html`,
        openReport: true,
      },
    ],
  ],
};

console.info('Global Setup Path:', require.resolve('../src/testSetup.ts'));
