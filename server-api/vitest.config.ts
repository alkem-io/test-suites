import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 1_800_000,
    globalSetup: './src/globalTestsSetup.ts',
    setupFiles: ['./src/setupTests.ts', './src/vitest.setup.ts'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './html-report/report.html',
    },
    include: ['src/**/*.it-spec.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'account',
          include: ['src/functional-api/account/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'activity-logs',
          include: ['src/functional-api/activity-logs/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'callouts',
          include: ['src/functional-api/callout/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'communication',
          include: ['src/functional-api/communications/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'configuration',
          include: ['src/functional-api/configuration/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'contributor-management',
          include: [
            'src/functional-api/contributor-management/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'documents',
          include: [
            'src/functional-api/integration/documents/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'entitlements',
          include: ['src/functional-api/entitlements/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'innovation-hub',
          include: ['src/functional-api/innovation-hub/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'innovation',
          include: ['src/functional-api/innovation-pack/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/functional-api/integration/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'journey',
          include: ['src/functional-api/journey/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'lifecycle',
          include: [
            'src/functional-api/templates/innovation-flow/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'lookup',
          include: ['src/functional-api/lookup/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'notifications',
          include: ['src/functional-api/notifications/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'notifications-callouts',
          include: [
            'src/functional-api/notifications/callouts/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'notifications-community',
          include: [
            'src/functional-api/notifications/community/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'notifications-messaging',
          include: [
            'src/functional-api/notifications/messaging/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'organization',
          include: [
            'src/functional-api/contributor-management/organization/**/*.it-spec.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'pagination',
          include: ['src/functional-api/pagination/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'platform',
          include: ['src/functional-api/platform/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'preferences',
          include: ['src/functional-api/preferences/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'roleset',
          include: ['src/functional-api/roleset/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'roleset-parallel',
          include: ['src/functional-api/roleset/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'search',
          include: ['src/functional-api/search/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'storage',
          include: ['src/functional-api/storage/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'subscriptions',
          include: ['src/functional-api/subscriptions/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'templates',
          include: ['src/functional-api/templates/**/*.it-spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'nightly',
          include: [
            'src/functional-api/account/**/*.it-spec.ts',
            'src/functional-api/roleset/**/*.it-spec.ts',
            'src/functional-api/contributor-management/**/*.it-spec.ts',
            'src/functional-api/callout/**/*.it-spec.ts',
            'src/functional-api/communications/**/*.it-spec.ts',
            'src/functional-api/activity-logs/**/*.it-spec.ts',
            'src/functional-api/journey/**/*.it-spec.ts',
            'src/functional-api/storage/**/*.it-spec.ts',
            'src/functional-api/entitlements/**/*.it-spec.ts',
            'src/functional-api/templates/**/*.it-spec.ts',
          ],
        },
      },
    ],
  },
});
