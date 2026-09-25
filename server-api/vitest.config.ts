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
      // workspace#027 — platform roles: who can do what. Two SEQUENTIAL phases of
      // one invocation (`pnpm test:platform-roles`), sharing ONE project-level
      // globalSetup (role seeding + fixtures once per run):
      //   1. `platform-roles`       role files + read-only specs, in parallel
      //   2. `platform-roles-rules` rule specs — they register users and create
      //      organizations, heavy server-side work that pushed a role-file
      //      positive past the ~5 s request cutoff when run beside it.
      // Deliberately NOT part of `nightly`: they need a server running 027.
      // `platform-roles-exclusive` (platform-wide positives) is on demand only.
      {
        extends: true as const,
        test: {
          name: 'platform-roles',
          include: [
            'src/functional-api/platform-roles/roles/**/*.it-spec.ts',
            'src/functional-api/platform-roles/coverage-guard.it-spec.ts',
            'src/functional-api/platform-roles/holder-lists.it-spec.ts',
            'src/functional-api/platform-roles/audit-trail.it-spec.ts',
          ],
          globalSetup: [
            './src/functional-api/platform-roles/_support/global-setup.ts',
          ],
          sequence: { groupOrder: 1 },
        },
      },
      {
        extends: true as const,
        test: {
          name: 'platform-roles-rules',
          include: [
            'src/functional-api/platform-roles/rules/**/*.it-spec.ts',
            'src/functional-api/platform-roles/role-integrity.it-spec.ts',
            'src/functional-api/platform-roles/audit-records.it-spec.ts',
          ],
          globalSetup: [
            './src/functional-api/platform-roles/_support/global-setup.ts',
          ],
          sequence: { groupOrder: 2 },
        },
      },
      {
        extends: true as const,
        test: {
          name: 'platform-roles-exclusive',
          include: [
            'src/functional-api/platform-roles/exclusive/**/*.it-spec.ts',
          ],
          globalSetup: [
            './src/functional-api/platform-roles/_support/global-setup.ts',
          ],
          fileParallelism: false,
          sequence: { groupOrder: 3 },
        },
      },
      project('graphql-guard', [
        'src/functional-api/graphql-guard/**/*.it-spec.ts',
      ]),
      project('language', ['src/functional-api/language/**/*.it-spec.ts']),
      project(
        'nightly',
        [
          'src/functional-api/account/**/*.it-spec.ts',
          'src/functional-api/roleset/**/*.it-spec.ts',
          // Feature 061's own notification specs ONLY. The whole
          // `notifications/**` tree is 29 it-specs: four of them need
          // RABBITMQ_MANAGEMENT_* env that no workflow sets, and the
          // `messaging/**` ones fall back to PRODUCTION digest windows when
          // their nine env vars are unset — a single negative assertion there
          // costs ~61 minutes (see test-suites/CLAUDE.md). Widening the glob
          // to the tree would have made nightly red and hours long for
          // reasons unrelated to this feature.
          'src/functional-api/notifications/space/community/organization-invitations.it-spec.ts',
          'src/functional-api/notifications/space/community/application-approval-new-member.it-spec.ts',
          'src/functional-api/notifications/space/community/invitations.it-spec.ts',
          // This organization-associates notification spec, same rationale as
          // above. Its one push-emit case skips itself where the RabbitMQ
          // management API is not configured (`rabbitMqManagementConfigured`),
          // and the loopback-Postgres cases under `roleset/associates/**` and
          // `contributor-management/organization/**` do the same on
          // `harnessPostgresConfigured` — so these files run nightly minus
          // exactly the cases the remote cluster cannot serve.
          'src/functional-api/notifications/organization/associates.it-spec.ts',
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
