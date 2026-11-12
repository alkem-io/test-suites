import { defineConfig } from '@playwright/test';
import { baseConfig, GENERATED_WALKS_DIR, LOCAL_STACK_TAG, suite } from './playwright.shared';

/**
 * The local-stack runner: the cases tagged `@local-stack`, which the nightly
 * cannot run against the shared test cluster and therefore leaves out.
 *
 *   pnpm run test:local-stack
 *
 * Each case still guards its own precondition when the stack is not set up
 * for it: most skip with the reason, while content-editing E8-4 FAILS with the
 * setup instruction (a skip there would hide that the cold load was never
 * proven). The loopback-DB cases stand alone, so only
 * they are run from their files; the others sit inside serial walks whose
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
 *   RABBITMQ_MANAGEMENT_* (US4-AS1p/AS5p), HARNESS POSTGRES_* (US4-AS8) and
 *   NOTIFICATIONS_STOP_CMD / NOTIFICATIONS_START_CMD (US4-AS6):
 *     form-callout-framing US4 (each guard skips with its reason when unset)
 *   IDLE_RELEASE_SECONDS=0 on the collaboration-service, and COLLAB_IDLE_RELEASE_SECONDS=0 plus
 *   COLLAB_METRICS_URL (the service's /metrics, e.g. http://localhost:4006/metrics) here:
 *     content-editing US1 E8-4 (the whole walk runs; the guard fails loudly without them)
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
        // W2 journey 5 E8-4 (a whiteboard's cold load after its room is released) needs
        // IDLE_RELEASE_SECONDS=0 on the collaboration-service and COLLAB_IDLE_RELEASE_SECONDS=0 plus
        // COLLAB_METRICS_URL on this run. It sits in a serial walk whose earlier cases draw the board and record its
        // element ids, so the whole file runs here (the nightly runs it without E8-4).
        name: 'Local stack — collaboration room release',
        testMatch: ['/content-editing/us1-whiteboard-draw-reopen.spec.ts'],
        tier: 'extended',
        capture: 'off',
      }),
      suite({
        // workspace#080: US4's three tagged cases stand alone on the file's
        // beforeAll fixture (each measures from its own baseline), so only they run.
        name: 'Local stack — form response notifications',
        testMatch: ['/form-callout-framing/us4-notifications.spec.ts'],
        grep: LOCAL_STACK_TAG,
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
