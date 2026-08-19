import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  NIGHTLY_EXCLUDE,
  NIGHTLY_INCLUDE,
  PARALLEL_MANIFEST,
  resolveNightlyWorkers,
} from './src/scripts/nightly-lanes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (...segments: string[]) => path.resolve(__dirname, ...segments);

/**
 * Helper to define a named project. Each project:
 * - Inherits root config (plugins, environment, globals, timeout, setupFiles, reporters)
 * - Inherits globalSetup from root; the setup file guards against duplicate invocations
 */
const project = (name: string, include: string[]) => ({
  extends: true as const,
  test: {
    name,
    include,
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
    // 'json' adds a machine-readable per-test verdict record alongside the
    // existing html report — it lands inside html-report/ so the untouched
    // scripts/publish-report.sh (which cp -r's the whole directory) publishes
    // it with zero script changes. Consumed by nightly-serial-confirm.mjs and
    // nightly-baseline-diff.mjs.
    reporters: ['default', 'html', 'json'],
    outputFile: {
      html: './html-report/index.html',
      json: './html-report/results.json',
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
      project('push-notifications', [
        'src/functional-api/push-notifications/**/*.it-spec.ts',
      ]),
      project('graphql-guard', [
        'src/functional-api/graphql-guard/**/*.it-spec.ts',
      ]),
      project('language', ['src/functional-api/language/**/*.it-spec.ts']),
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
        'src/functional-api/push-notifications/**/*.it-spec.ts',
        'src/functional-api/language/**/*.it-spec.ts',
      ]),
      // nightly-parallel / nightly-serial — the two-lane split of the nightly
      // scope. Membership is derived from the single source in
      // `src/scripts/nightly-lanes.ts` so this config and the lane guard's
      // proof cannot drift apart. Distinct `sequence.groupOrder` values are
      // mandatory: vitest runs groups sequentially (parallel lane first — a
      // serial-lane file crashing mid-file can leak shared-state mutations,
      // and running serial last keeps that leak out of the same night's
      // concurrent pass) and throws at startup if two projects in the
      // same group have different `maxWorkers` — that throw is the fail-closed
      // misconfiguration check for this split.
      {
        extends: true as const,
        test: {
          name: 'nightly-parallel',
          include: [...PARALLEL_MANIFEST],
          // Explicit, documented lane-scope exclusions (src/scripts/nightly-lanes.ts)
          // — never promoted files, but excluded here too so a stale/mistaken
          // manifest entry still can't slip an excluded file into the run.
          exclude: [...NIGHTLY_EXCLUDE],
          sequence: { groupOrder: 0 },
          // NIGHTLY_MAX_WORKERS is the ONLY source of `effective` (src/scripts/nightly-lanes.ts
          // resolveNightlyWorkers) — never clamped against CPU.
          // NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT only derives a sanity-check budget: when the
          // requested value exceeds it, resolution THROWS at config-load time (a misconfigured
          // runner) unless NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION is deliberately set — see
          // globalTestsSetup.ts for the run-time log line.
          maxWorkers: resolveNightlyWorkers(
            process.env.NIGHTLY_MAX_WORKERS,
            process.env.NIGHTLY_MAX_WORKERS_CPU_CAP_PERCENT,
            process.env.NIGHTLY_ALLOW_CPU_OVERSUBSCRIPTION
          ).effective,
          retry: 0,
        },
      },
      {
        extends: true as const,
        test: {
          name: 'nightly-serial',
          include: [...NIGHTLY_INCLUDE],
          exclude: [...PARALLEL_MANIFEST, ...NIGHTLY_EXCLUDE],
          sequence: { groupOrder: 1 },
          maxWorkers: 1,
          retry: 0,
        },
      },
    ],
  },
});
