import baseConfig from './jest.config.mjs';

export default {
  ...baseConfig,
  testRegex: [
    '/src/functional-api/account/.*\\.it-spec\\.ts',
    '/src/functional-api/roleset/.*\\.it-spec\\.ts',
    '/src/functional-api/contributor-management/.*\\.it-spec\\.ts',
    '/src/functional-api/callout/.*\\.it-spec\\.ts',
    '/src/functional-api/zcommunications/.*\\.it-spec\\.ts',
    '/src/functional-api/activity-logs/.*\\.it-spec\\.ts',
    '/src/functional-api/journey/.*\\.it-spec\\.ts',
    '/src/functional-api/storage/.*\\.it-spec\\.ts',
    '/src/functional-api/entitlements/.*\\.it-spec\\.ts',
    '/src/functional-api/template/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-nightly',
};
