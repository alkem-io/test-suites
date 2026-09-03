import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (...segments: string[]) => path.resolve(__dirname, ...segments);

/**
 * Helper to define a named project. Each project:
 * - Inherits root config (plugins, environment, globals, timeout, setupFiles, reporters)
 * - Inherits globalSetup from root; the setup file guards against duplicate invocations
 */
// `exclude` is deliberately omitted from the returned test config when empty
// rather than set to `[]` — vitest project config REPLACES (not merges) an
// inherited `test.exclude`, so setting it unconditionally would silently
// drop vitest's own default excludes (`**/node_modules/**`, …) on every
// project that doesn't need one.
const project = (name: string, include: string[], exclude?: string[]) => ({
  extends: true as const,
  test: {
    name,
    include,
    ...(exclude && exclude.length > 0 ? { exclude } : {}),
  },
});

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
    testTimeout: 1_800_000, // 30 minutes — integration tests call remote APIs and create complex scenarios
    hookTimeout: 120_000, // beforeAll hooks create multiple entities via API, so they need more headroom
    globalSetup: './src/globalTestsSetup.ts',
    setupFiles: ['./src/setupTests.ts'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './html-report/index.html',
    },
    projects: [
      project('account', ['src/functional-api/account/**/*.it-spec.ts']),
      project('activity-logs', [
        'src/functional-api/activity-logs/**/*.it-spec.ts',
      ]),
      project('callouts', ['src/functional-api/callout/**/*.it-spec.ts']),
      project('collabora', ['src/functional-api/collabora/**/*.it-spec.ts']),
      project('communication', [
        'src/functional-api/communications/**/*.it-spec.ts',
      ]),
      project('conversations', [
        'src/functional-api/communications/conversations/**/*.it-spec.ts',
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
      project('notifications-callout-reactions', [
        'src/functional-api/notifications/callout-reactions/**/*.it-spec.ts',
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
      project('visual', ['src/functional-api/visual/**/*.it-spec.ts']),
      project('calendar', ['src/functional-api/calendar/**/*.it-spec.ts']),
      project('push-notifications', [
        'src/functional-api/push-notifications/**/*.it-spec.ts',
      ]),
      project('graphql-guard', [
        'src/functional-api/graphql-guard/**/*.it-spec.ts',
      ]),
      project('language', ['src/functional-api/language/**/*.it-spec.ts']),
      project(
        'nightly',
        [
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
          'src/functional-api/visual/**/*.it-spec.ts',
          'src/functional-api/calendar/**/*.it-spec.ts',
          'src/functional-api/push-notifications/**/*.it-spec.ts',
          'src/functional-api/language/**/*.it-spec.ts',
        ],
        // 054-delete-own-account: these it-specs need loopback Redis/Postgres
        // and a matching local/CI `SESSION_SIGNING_KEY`
        // (`lib/src/scenario/registration/mint-bff-session.ts`,
        // `lib/src/config/loopback-guard.ts`) that the nightly workflow does
        // not and must never provide — wiring the shared cluster's session-
        // signing-key material into a public CI job to make them pass there
        // would turn a latent impersonation capability into a disclosed one.
        // Decision: local-compose-stack-only; run via `test:contributormanagement`
        // locally, never nightly.
        [
          'src/functional-api/contributor-management/user/delete-own-account*.it-spec.ts',
        ]
      ),
    ],
  },
});
