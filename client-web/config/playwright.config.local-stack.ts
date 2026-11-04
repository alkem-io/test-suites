import { defineConfig } from '@playwright/test';
import { baseConfig, GENERATED_WALKS_DIR, LOCAL_STACK_TAG, suite } from './playwright.shared';

/**
 * The local-stack runner: the cases tagged `@local-stack`, which the nightly
 * cannot run against the shared test cluster and therefore leaves out.
 *
 *   pnpm run test:local-stack
 *
 * Each case still guards its own precondition and skips with the reason when
 * the stack is not set up for it. The loopback-DB cases stand alone, so only
 * they are run from their files; the other two sit inside serial walks whose
 * earlier steps they need, so their whole file runs here. What they need on
 * top of the usual .env:
 *
 *   HARNESS_POSTGRES_* / HARNESS_REDIS_*   loopback DB access (lib optional-infra):
 *     subspaces-callout US2-AS6, organization-user-associates US3-AS9 and US7-AS6
 *   RABBITMQ_MANAGEMENT_ENDPOINT/_USER/_PASSWORD   queue publish counters:
 *     contribution-notify-switch US2-AS1 (task path)
 *   PLATFORM_INVITATION_RESEND_COOLDOWN_SECONDS (<= 120, set on the SERVER too):
 *     organization-email-invitations US3-AS3
 *   RABBITMQ_MANAGEMENT_* plus the nine MESSAGING_DIGEST_* variables (same
 *   values on the SERVER, see the suite's test plan):
 *     messaging-notifications US1 and US2 (whole walks), US3-AS3 and US3-AS4
 */
export default defineConfig(
  baseConfig({
    globalSetup: './global-setup.ts',
    reportFolder: 'playwright-report-local-stack',
    localStackOnly: true,
    projects: [
      suite({
        name: 'Local stack — loopback DB',
        testMatch: [
          '/subspaces-callout/us2-expanded-card-switch.spec.ts',
          '/organization-user-associates/us3-apply-and-decide.spec.ts',
          '/organization-user-associates/us7-pending-lists-integrity.spec.ts',
        ],
        grep: LOCAL_STACK_TAG,
        tier: 'long',
      }),
      suite({
        name: 'Local stack — queue counters',
        testDir: GENERATED_WALKS_DIR,
        testMatch: ['contribution-notify-switch.spec.ts'],
        tier: 'long',
      }),
      suite({
        name: 'Local stack — server env overrides',
        testMatch: ['/organization-email-invitations/us3-resend.spec.ts'],
        tier: 'long',
      }),
      suite({
        // workspace#034 (conversation-message notifications, notifications#522):
        // queue counters plus MESSAGING_DIGEST_* windows. US1/US2 are tagged at
        // describe level; US3's tagged AS3/AS4 sit inside a serial walk that
        // needs AS1's recipient, so all three files run whole here.
        name: 'Local stack — messaging digests',
        testMatch: ['/messaging-notifications/*.spec.ts'],
        tier: 'long',
      }),
    ],
  })
);
