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
      // workspace#027-platform-role-redesign (T005/T008/T009). Both
      // projects read the SAME generated table (role-action-matrix.data.ts)
      // — the `PLATFORM_ROLES_MATRIX_SCOPE` env var each project sets is
      // what `role-action-matrix.it-spec.ts` reads to pick
      // `buildCanonicalMatrix` (one surface per live A-row — the
      // PR-feedback inner loop) vs. `buildMatrix` (the full cross-product —
      // the Slice B release-train gate). A second table would be the defect
      // this shape avoids; a second env var name would be too, so it lives
      // nowhere else.
      //
      // qual-ts-15 (2026-07-30 fix wave): the two projects' `include` globs
      // are DELIBERATELY DIFFERENT — `role-action-matrix.it-spec.ts` is the
      // ONLY file that reads `PLATFORM_ROLES_MATRIX_SCOPE`
      // (`role-action-matrix.data.ts`'s `activeMatrixScope()`), so it is the
      // only file whose behaviour differs between the two projects. Every
      // other spec in the directory (assignment-rules, audit-coverage,
      // grantability, immediacy, matrix-completeness, mirror-integrity,
      // the three `flows/` files) previously ran identically in BOTH
      // projects — eight `buildMatrixFixtures()` builds (~35 live API
      // writes each) plus eight platform-wide `authorizationPlatformRolesAccessReset`
      // calls, entirely redundant. `platform-roles-canonical` now covers
      // only the scope-sensitive file; `platform-roles` still covers the
      // whole directory as the Slice B release-train gate.
      {
        extends: true as const,
        test: {
          name: 'platform-roles-canonical',
          // spec-ts-14/qual-ts-18 fix: `matrix-completeness.it-spec.ts` is
          // back in this include list — it is what T017c documents as
          // needing to "run and fail even when the matrix body is filtered
          // down", i.e. exactly the canonical scope. It is cheap (one live
          // role-set query plus file/inventory checks), unlike the eight
          // OTHER non-matrix files (assignment-rules, grantability,
          // immediacy, the three flows/, audit-coverage, mirror-integrity)
          // this project still deliberately excludes per qual-ts-15's
          // redundant-fixture-build reasoning — see the new
          // `platform-roles-rules` project below for those.
          include: [
            'src/functional-api/platform-roles/role-action-matrix.it-spec.ts',
            'src/functional-api/platform-roles/matrix-completeness.it-spec.ts',
          ],
          env: { PLATFORM_ROLES_MATRIX_SCOPE: 'canonical' },
          setupFiles: [
            './src/functional-api/platform-roles/platform-roles.setup.ts',
          ],
          // corr-ts-5/qual-ts-6 (2026-07-30 fix wave): every file here
          // shares mutable state through the SAME shared TestUser fixtures
          // (`fixtures.ts`'s `targetUserId`/`rolesProbeUserId` resolve to
          // fixed identities, and `platform-roles-admin`'s holder count is
          // read/written across files) — running spec files in parallel
          // races those mutations. Every other integration project in this
          // repo is invoked with `--fileParallelism=false` for the same
          // reason; this sets it in the project config itself so it applies
          // regardless of how the project is invoked.
          fileParallelism: false,
        },
      },
      {
        extends: true as const,
        test: {
          name: 'platform-roles',
          include: ['src/functional-api/platform-roles/**/*.it-spec.ts'],
          env: { PLATFORM_ROLES_MATRIX_SCOPE: 'full' },
          setupFiles: [
            './src/functional-api/platform-roles/platform-roles.setup.ts',
          ],
          fileParallelism: false,
        },
      },
      // sec-test-suites-10 fix (2026-07-30 corrective wave): after the
      // qual-ts-15 split above, `platform-roles-canonical` covered ONLY
      // `role-action-matrix.it-spec.ts` — leaving the eight files that
      // exercise the separation-of-duties RULE ENGINE itself (self-
      // assignment, last-Roles-Admin protection, audit-reader exclusion,
      // the service-profile marker, FR-031 revocation immediacy, the three
      // stateful `flows/` specs, the audit-coverage and completeness/
      // mirror-integrity guards) with NO Slice-A gate executing them at
      // all — a live check written and shipped in this very feature, never
      // run before release. This project runs every file in the directory
      // EXCEPT the scope-sensitive matrix spec (which stays owned by
      // `platform-roles-canonical`/`platform-roles` above, per qual-ts-15),
      // exactly once, as a Slice A verification track.
      {
        extends: true as const,
        test: {
          name: 'platform-roles-rules',
          include: ['src/functional-api/platform-roles/**/*.it-spec.ts'],
          exclude: [
            'src/functional-api/platform-roles/role-action-matrix.it-spec.ts',
          ],
          setupFiles: [
            './src/functional-api/platform-roles/platform-roles.setup.ts',
          ],
          fileParallelism: false,
        },
      },
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
      ]),
    ],
  },
});
