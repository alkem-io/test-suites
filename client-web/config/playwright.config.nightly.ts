import { defineConfig } from '@playwright/test';
import { baseConfig, GENERATED_WALKS_DIR, suite } from './playwright.shared';

/**
 * The nightly runner: every suite that is green against a freshly deployed
 * test cluster, as one project each. Browser, viewport, timeouts, retries,
 * reporters and artifact policy all come from `playwright.shared.ts` — a
 * project here declares WHAT runs and which timeout TIER it needs, nothing
 * else. See docs/e2e-conventions.md for the rules a suite must follow before
 * it is listed here.
 *
 *   pnpm run test:nightly                        # everything, PW_BROWSER=chrome
 *   PW_BROWSER=firefox pnpm run test:nightly     # same suites, another browser
 *   pnpm run test:nightly --project=Callouts     # one suite
 *
 * Files run one at a time (`workers: 1` unless PW_WORKERS says otherwise):
 * several suites still share the harness personas and the one MailSlurper
 * inbox. Raising the worker count is a per-suite audit, not a config flip.
 */
export default defineConfig(
  baseConfig({
    globalSetup: './global-setup.ts',
    reportFolder: 'playwright-report',
    projects: [
      suite({
        name: 'Authentication',
        testMatch: [
          '/authentication/authentication-page-verification.spec.ts',
          '/authentication/authentication-login.spec.ts',
          '/authentication/authentication-registration.spec.ts',
          '/authentication/authentication-password-recovery.spec.ts',
          '/authentication/authentication-cookie-consent.spec.ts',
          '/authentication/authentication-restricted-access.spec.ts',
        ],
        // Registration and recovery wait for mail round trips.
        tier: 'extended',
      }),
      suite({
        name: 'Space',
        testMatch: ['/space/organization-space-create.spec.ts', '/space/space-create.spec.ts'],
      }),
      suite({ name: 'Public Space', testMatch: ['/public-space/*.spec.ts'] }),
      suite({
        name: 'Support navigation',
        testMatch: [
          '/support-navigation/support-navigation.spec.ts',
          '/support-navigation/support-navigation-additional.spec.ts',
        ],
      }),
      suite({
        name: 'Explore platform',
        testMatch: [
          '/explore-platform/explore-platform-anonymous.spec.ts',
          '/explore-platform/explore-platform-authenticated.spec.ts',
        ],
      }),
      suite({
        name: 'Callouts',
        testMatch: [
          '/callouts/0.1callout-full-workflow.spec.ts',
          '/callouts/0.2callout-access-control.spec.ts',
          '/callouts/0.3callout-comments.spec.ts',
          '/callouts/0.4callout-contributions.spec.ts',
          '/callouts/0.5callout-creation.spec.ts',
          '/callouts/0.6callout-deletion.spec.ts',
          '/callouts/0.7callout-editing.spec.ts',
          '/callouts/0.8callout-subspace-creation.spec.ts',
          '/callouts/0.9callout-viewing.spec.ts',
        ],
      }),
      suite({
        // `templates-CRD/` is the migrated, validated suite for the redesigned
        // Templates settings page (see templates-CRD/instructions.md).
        name: 'Templates',
        testMatch: [
          '/templates-CRD/template-types/callout-tests.spec.ts',
          '/templates-CRD/template-types/community-guidelines-template.spec.ts',
          '/templates-CRD/template-types/post-template.spec.ts',
          '/templates-CRD/template-types/whiteboard-template.spec.ts',
          // workspace#080 ruling R25: Poll / Form posts saved as templates and reused.
          '/templates-CRD/template-types/poll-form-save-as-template.spec.ts',
        ],
        // A memo response walks the whole contribution flow inside one case.
        tier: 'extended',
      }),
      suite({
        // workspace#085-authz-admin-guard (client-web#9537): the four admin
        // role surfaces as real personas, the fail-closed/denied paths, and the
        // memo Sign action gate (#6478 / #10278).
        name: 'Authz admin guard',
        testMatch: [
          '/authz-admin-guard/space-community-role-changes.spec.ts',
          '/authz-admin-guard/org-associates-authorization.spec.ts',
          '/authz-admin-guard/platform-global-roles.spec.ts',
          '/authz-admin-guard/unverifiable-and-denied.spec.ts',
          '/authz-admin-guard/memo-sign-action-gate.spec.ts',
        ],
      }),
      suite({
        name: 'Applications',
        testMatch: [
          '/applications/space-applications-level-0.spec.ts',
          '/applications/space-applications-level-1.spec.ts',
          '/applications/space-applications-level-1-public-parent.spec.ts',
        ],
      }),
      suite({
        name: 'Default Template Per Flow State',
        testMatch: ['/default-template/default-template-per-flow-state.spec.ts'],
      }),
      suite({
        name: 'User Profile',
        testMatch: [
          '/user-profile/access-user-profile-from-dashboard.spec.ts',
          '/user-profile/direct-url-access-to-user-profile.spec.ts',
          '/user-profile/update-basic-information.spec.ts',
          '/user-profile/view-profile-information.spec.ts',
          // workspace#038 (MCP API keys, alkem-io/alkemio#1984): mint + revoke
          // walks on the account's Security settings; self-cleaning.
          '/user-profile/mcp-api-keys-mint.spec.ts',
          '/user-profile/mcp-api-keys-revoke.spec.ts',
        ],
        tier: 'extended',
      }),
      suite({
        // workspace#060 (forum category reorganisation): recategorise through
        // the edit dialog, locale labels. API-seeded discussion, deleted after.
        name: 'Forum categories',
        testMatch: ['/forum-categories/*.spec.ts'],
      }),
      suite({
        // Whole-day calendar timezone coverage (server#6279): the browser
        // timezone is pinned per test context, so this is valid against the
        // UTC test cluster.
        name: 'Timeline',
        testMatch: ['/timeline/*.spec.ts'],
      }),
      suite({
        // Feature 029 (detect signup language). The suite mixes anonymous
        // walks (each needs a virgin cookie jar) with authenticated ones and
        // drives a different `locale` per file, so sessions come from this
        // setup project (one sign-in per persona, persisted to `.auth/`) and
        // the specs opt in with `test.use({ storageState })`.
        name: 'Language offer setup',
        testMatch: ['/language-offer/auth.setup.ts'],
        tier: 'extended',
      }),
      suite({
        name: 'Language offer',
        testMatch: ['/language-offer/*.spec.ts'],
        dependencies: ['Language offer setup'],
        tier: 'extended',
        // Validated at this resolution; the offer banner layout is viewport-sensitive.
        use: { viewport: { width: 1440, height: 900 } },
      }),
      suite({
        // Feature 033 (chat avatars): every scenario is a multi-user round
        // trip through the live chat room (send on one session, wait for the
        // subscription push on another); US2 uploads and crops photos too.
        name: 'Chat avatars',
        testMatch: ['/chat-avatars/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // workspace#034 (conversation-message notifications, notifications#522):
        // US1 direct and US2 group walks send on one session and wait for the
        // bell/push on another; US3 round-trips the settings rows. Since
        // client-web#10365 the browser sends through its own Matrix session,
        // so this is the cheapest nightly proof that message notifications
        // still fire end to end. Each file registers fresh personas through
        // the real sign-up flow (see messaging.helpers.ts), so the in-app
        // setting the API notification specs leave off on the shared
        // personas cannot reach these walks.
        name: 'Messaging notifications',
        testMatch: ['/messaging-notifications/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // client-web#10033 / workspace#076 (expanded subspace cards): each
        // file seeds its own public Space through the API and deletes it in
        // afterAll; fixtures carry up to seven subspaces.
        name: 'Subspaces callout',
        testMatch: ['/subspaces-callout/*.spec.ts'],
        tier: 'extended',
      }),
      suite({
        // client-web#10178 (space banner): the crop walk uploads a generated
        // PNG and drives the crop dialog.
        name: 'Space banner',
        testMatch: ['/space-banner/*.spec.ts'],
        tier: 'extended',
      }),
      suite({
        // workspace#040 (sidebar widget configuration): US1 default rendering
        // per role, US2 admin configuration round trips. Self-seeding, serial
        // per file, trace/video off at file level (admin sessions). US2-AS6 is
        // test.skip'ped pending alkem-io/server#6571 and stays last in its file.
        name: 'Sidebar widgets',
        testMatch: ['/sidebar-widgets/*.spec.ts'],
        tier: 'extended',
      }),
      suite({
        // workspace#024 (classifications, epic alkem-io/alkemio#1985): Space-
        // side and template-side acceptance walks, each file seeding its own
        // Space and deleting it in afterAll. TL-01 carries two deliberate soft
        // reds pending a product decision (see classifications-test-plan.md).
        name: 'Classifications',
        testMatch: ['/classifications/*.spec.ts'],
        tier: 'extended',
        // A renamed control fails in seconds instead of burning the budget.
        use: { actionTimeout: 15_000 },
      }),
      suite({
        // client-web#10107 / workspace#054 (self-service account deletion):
        // the portable delta after test-suites#620. Every case is self-seeding
        // (disposable Kratos identities registered and deleted in the spec);
        // the API-level cases live in server-api's `nightly` vitest project.
        name: 'Account deletion',
        testMatch: [
          '/account-deletion/profile-removed-notification.spec.ts',
          '/account-deletion/former-member-activity.spec.ts',
          '/account-deletion/account-deletion-visibility.spec.ts',
        ],
        tier: 'long',
      }),
      suite({
        // Feature 038 (callout emoji reactions): forge-verify persists its
        // acceptance walks in `tests/`, outside the hand-authored tree, so
        // they survive re-runs without colliding with these suites.
        name: 'Callout reactions',
        testDir: GENERATED_WALKS_DIR,
        testMatch: ['callout-reactions.spec.ts'],
        tier: 'extended',
      }),
      suite({
        // Feature 041 (callout reaction notifications): negative assertions
        // hold a multi-sample settle window on top of the positive poll.
        name: 'Callout reaction notifications',
        testDir: GENERATED_WALKS_DIR,
        testMatch: ['callout-reaction-notifications.spec.ts'],
        tier: 'long',
      }),
      suite({
        // Feature 061 (organization space invitations): full SPA invite flows
        // plus negative mail-window polls (`assertNoMailTo`).
        name: 'Organization space invitations',
        testMatch: ['/organization-space-invitations/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // Feature 062 (organization user associates): every file registers
        // several Kratos identities through the shared MailSlurper inbox, so
        // the files stay serial (worker count + describe.configure).
        name: 'Organization user associates',
        testMatch: ['/organization-user-associates/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // workspace#081 (organization email invitations): mail-driven sign-up
        // and resend windows.
        name: 'Organization email invitations',
        testMatch: ['/organization-email-invitations/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // workspace#083 (organization leaves a Space, server#6560): each file
        // seeds its own scenario (invite + accept) and retries navigation until
        // the settings guard sees freshly granted roles.
        name: 'Organization space membership',
        testMatch: ['/organization-space-membership/*.spec.ts'],
        tier: 'long',
      }),
      suite({
        // Feature 070 (contribution notify switch): forge-verify walk, asserts
        // at the RabbitMQ publish counter when RABBITMQ_MANAGEMENT_* is set
        // (`rabbitMqManagementConfigured`) and skips those checks otherwise.
        name: 'Contribution notify switch',
        testDir: GENERATED_WALKS_DIR,
        testMatch: ['contribution-notify-switch.spec.ts'],
        tier: 'long',
      }),
      suite({
        // workspace#077 (richer contributor cards, client-web#10316): every
        // file seeds its own public Space through the API. The shipped
        // 0.1contributors-callout.spec.ts is deliberately NOT listed: its
        // cleanup lives only in the Member block, so any Admin-block failure
        // leaks a Space, an Organization and a VC. List it once its cleanup
        // moves to file level.
        name: 'Contributors callout',
        testMatch: [
          '/contributors-callout/us1-card-content.spec.ts',
          '/contributors-callout/us2-nothing-else-changes.spec.ts',
          '/contributors-callout/us3-card-menu.spec.ts',
          '/contributors-callout/us4-joined-this-space.spec.ts',
          '/contributors-callout/us5-organisation-website.spec.ts',
        ],
        tier: 'extended',
      }),
    ],
  })
);
