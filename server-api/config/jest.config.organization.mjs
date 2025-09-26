import config from './jest.config.mjs';

export default {
  ...config,
  testRegex: [
    '/src/functional-api/contributor-management/organization/.*\\.it-spec\\.ts',
  ],
  coverageDirectory: '<rootDir>/coverage-ci',
};
