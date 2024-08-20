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
