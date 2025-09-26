import baseConfig from './jest.config.mjs';

export default {
  ...baseConfig,
  testRegex: [
    '/src/functional-api/contributor-management/organization/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
