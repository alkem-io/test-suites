const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testTimeout: 20000,
  collectCoverage: false,
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
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
  moduleNameMapping: {
    '^@alkemio/tests-lib(.*)$': '<rootDir>/../lib/src$1',
    '^@functional-api/(.*)$': '<rootDir>/src/functional-api/$1',
  },
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './html-report',
        filename: `report_${new Date().toISOString().replace(/[:.]/g, '_')}.html`,
        openReport: false,
      },
    ],
  ],
  globalSetup: '<rootDir>/src/globalTestsSetup.ts',
};

export default baseConfig;
