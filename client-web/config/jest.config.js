const { compilerOptions } = require('../tsconfig');

module.exports = {
  rootDir: '..',
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/tests-examples/**/*.spec.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@generated/(.*)$': '<rootDir>/test/generated/$1',
    '^@utils/(.*)$': '<rootDir>/test/utils/$1',
    '^@functional-api/(.*)$': '<rootDir>/test/functional-api/$1',
    '^@alkemio/tests-lib$': '<rootDir>/../lib/src/index.ts',
    '^@alkemio/tests-lib/(.*)$': '<rootDir>/../lib/src/$1',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFiles: ['<rootDir>/setupTests.ts'],
  roots: ['<rootDir>/src', '<rootDir>/tests-examples'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@alkemio/tests-lib)/)'],
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [],
  testTimeout: 10000,
  collectCoverage: false,
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

console.info('Jest configuration loaded successfully');
