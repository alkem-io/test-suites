import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (...segments: string[]) => path.resolve(__dirname, ...segments);

/**
 * Helper to define a named project. Each project:
 * - Inherits root config (plugins, environment, globals, timeout, setupFiles, reporters)
 * - Overrides globalSetup to [] so it only runs once from the root project
 */
const project = (name: string, include: string[]) => ({
  extends: true as const,
  test: {
    name,
    include,
    globalSetup: [] as string[],
  },
});

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0'),
  String(now.getHours()).padStart(2, '0'),
  String(now.getMinutes()).padStart(2, '0'),
  String(now.getSeconds()).padStart(2, '0'),
].join('-');

export default defineConfig({
  resolve: {
    alias: {
      '@generated': resolve('src/core/generated'),
      '@utils': resolve('src/utils'),
      '@common': resolve('src/common'),
      '@functional-api': resolve('src/functional-api'),
      '@src': resolve('src'),
      '@alkemio/tests-lib': resolve('../lib/src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    pool: 'threads',

    isolate: false,
    testTimeout: 60_000, // generous for individual API-based tests
    hookTimeout: 120_000, // beforeAll hooks create multiple entities via API, so they need more headroom
    globalSetup: './src/globalTestsSetup.ts',
    setupFiles: ['./src/setupTests.ts'],
    reporters: ['html'],
    outputFile: {
      html: `./html-report/report_${timestamp}.html`,
    },
    projects: [
      project('account', ['src/functional-api/account/**/*.it-spec.ts']),
      project('activity-logs', [
        'src/functional-api/activity-logs/**/*.it-spec.ts',
      ]),
      project('callouts', ['src/functional-api/callout/**/*.it-spec.ts']),
      project('communication', [
        'src/functional-api/communications/**/*.it-spec.ts',
      ]),
      project('configuration', [
        'src/functional-api/configuration/**/*.it-spec.ts',
      ]),
      project('contributor-management', [
        'src/functional-api/contributor-management/**/*.it-spec.ts',
      ]),
      project('documents', [
        'src/functional-api/integration/documents/**/*.it-spec.ts',
      ]),
      project('entitlements', [
        'src/functional-api/entitlements/**/*.it-spec.ts',
      ]),
      project('innovation-hub', [
        'src/functional-api/innovation-hub/**/*.it-spec.ts',
      ]),
      project('innovation', [
        'src/functional-api/innovation-pack/**/*.it-spec.ts',
      ]),
      project('integration', [
        'src/functional-api/integration/**/*.it-spec.ts',
      ]),
      project('journey', ['src/functional-api/journey/**/*.it-spec.ts']),
      project('lifecycle', [
        'src/functional-api/templates/innovation-flow/**/*.it-spec.ts',
      ]),
      project('lookup', ['src/functional-api/lookup/**/*.it-spec.ts']),
      project('notifications', [
        'src/functional-api/notifications/**/*.it-spec.ts',
      ]),
      project('notifications-callouts', [
        'src/functional-api/notifications/callouts/**/*.it-spec.ts',
      ]),
      project('notifications-community', [
        'src/functional-api/notifications/community/**/*.it-spec.ts',
      ]),
      project('notifications-messaging', [
        'src/functional-api/notifications/messaging/**/*.it-spec.ts',
      ]),
      project('organization', [
        'src/functional-api/contributor-management/organization/**/*.it-spec.ts',
      ]),
      project('pagination', ['src/functional-api/pagination/**/*.it-spec.ts']),
      project('platform', ['src/functional-api/platform/**/*.it-spec.ts']),
      project('preferences', [
        'src/functional-api/preferences/**/*.it-spec.ts',
      ]),
      project('roleset', ['src/functional-api/roleset/**/*.it-spec.ts']),
      project('search', ['src/functional-api/search/**/*.it-spec.ts']),
      project('storage', ['src/functional-api/storage/**/*.it-spec.ts']),
      project('subscriptions', [
        'src/functional-api/subscriptions/**/*.it-spec.ts',
      ]),
      project('templates', ['src/functional-api/templates/**/*.it-spec.ts']),
      project('calendar', ['src/functional-api/calendar/**/*.it-spec.ts']),
      project('graphql-guard', [
        'src/functional-api/graphql-guard/**/*.it-spec.ts',
      ]),
      project('nightly', [
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
        'src/functional-api/calendar/**/*.it-spec.ts',
      ]),
    ],
  },
});
