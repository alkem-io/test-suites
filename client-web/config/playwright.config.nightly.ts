import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '../', '.env') });

/**
 * Playwright configuration for running tests matching specific patterns.
 *
 * Usage examples:
 *
 * 1. Run all seed tests:
 *    npx playwright test --config=playwright.pattern.config.ts --grep "seed"
 *
 * 2. Run tests in a specific directory:
 *    npx playwright test --config=playwright.pattern.config.ts authentication/
 *
 * 3. Run tests matching a pattern in filename:
 *    npx playwright test --config=playwright.pattern.config.ts seed*.spec.ts
 *
 * 4. Run tests with specific tag (if using @tag in test names):
 *    npx playwright test --config=playwright.pattern.config.ts --grep "@smoke"
 *
 * 5. Exclude certain tests:
 *    npx playwright test --config=playwright.pattern.config.ts --grep-invert "slow"
 *
 * 6. Combine patterns:
 *    npx playwright test --config=playwright.pattern.config.ts --grep "authentication" --grep-invert "skip"
 *
 * Environment variables:
 * - TEST_PATTERN: Regex pattern to match test files (e.g., "seed|authentication")
 * - TEST_DIR: Subdirectory to run tests from (default: ./src/functional-e2e)
 * - UI_HEADLESS: Set to 'false' to run tests in headed mode
 */
// the testing directory relative to this config file
const testDirectory = '../src/functional-e2e';

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: testDirectory,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Authentication',
      testMatch: [
        '/authentication/authentication-page-verification.spec.ts',
        '/authentication/authentication-login.spec.ts',
        '/authentication/authentication-registration.spec.ts',
        '/authentication/authentication-password-recovery.spec.ts',
        '/authentication/authentication-cookie-consent.spec.ts',
        '/authentication/authentication-restricted-access.spec.ts',
      ],
    },
    {
      name: 'Space',
      testMatch: [
        '/space/organization-space-create.spec.ts',
        '/space/space-create.spec.ts',
      ],
    },
    {
      name: 'Public Space',
      testMatch: ['/public-space/*.spec.ts'],
    },
    {
      name: 'Support navigation',
      testMatch: [
        '/support-navigation/support-navigation.spec.ts',
        '/support-navigation/support-navigation-additional.spec.ts',
      ],
    },
    {
      name: 'Explore platform',
      testMatch: [
        '/explore-platform/explore-platform-anonymous.spec.ts',
        '/explore-platform/explore-platform-authenticated.spec.ts',
      ],
    },
    {
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
    },
    {
      name: 'Templates',
      // The legacy `templates/` suite targets the pre-CRD Templates settings
      // page and fails wholesale against the redesigned UI. `templates-CRD/`
      // is the migrated, validated equivalent — see
      // src/functional-e2e/templates-CRD/instructions.md for the selector map.
      testMatch: [
        '/templates-CRD/template-types/callout-tests.spec.ts',
        '/templates-CRD/template-types/community-guidelines-template.spec.ts',
        '/templates-CRD/template-types/post-template.spec.ts',
        '/templates-CRD/template-types/whiteboard-template.spec.ts',
      ],
    },
    {
      // workspace#085-authz-admin-guard (client-web#9537, Release 75): the four
      // admin role surfaces as real personas, the fail-closed/denied paths, and
      // the memo Sign action gate (#6478 / #10278).
      name: 'Authz admin guard',
      testMatch: [
        '/authz-admin-guard/space-community-role-changes.spec.ts',
        '/authz-admin-guard/org-associates-authorization.spec.ts',
        '/authz-admin-guard/platform-global-roles.spec.ts',
        '/authz-admin-guard/unverifiable-and-denied.spec.ts',
        '/authz-admin-guard/memo-sign-action-gate.spec.ts',
      ],
    },
    {
      name: 'Applications',
      testMatch: [
        '/applications/space-applications-level-0.spec.ts',
        '/applications/space-applications-level-1.spec.ts',
      ],
    },
    {
      name: 'Default Template Per Flow State',
      testMatch: ['/default-template/default-template-per-flow-state.spec.ts'],
    },
    {
      name: 'User Profile',
      testMatch: [
        '/user-profile/access-user-profile-from-dashboard.spec.ts',
        '/user-profile/direct-url-access-to-user-profile.spec.ts',
        '/user-profile/update-basic-information.spec.ts',
        '/user-profile/view-profile-information.spec.ts',
      ],
    },
    {
      // Whole-day calendar timezone coverage (server#6279): rendering across
      // browser timezones + client-driven CRUD. Browser TZ is pinned per test
      // context, so these are valid against the UTC acceptance server.
      name: 'Timeline',
      testMatch: ['/timeline/*.spec.ts'],
    },
    {
      // Feature 029 (detect signup language) — sign-in project for the walks
      // below. The suite mixes anonymous tests (each needs a virgin cookie jar)
      // with authenticated ones and drives a different `locale` per file, so
      // authentication cannot come from a project-wide `storageState`. This
      // project logs each persona in ONCE and persists the session to `.auth/`;
      // the specs opt in with `test.use({ storageState })`.
      // Kept in sync with config/playwright.config.language-offer.ts, the
      // standalone runner used to develop the suite.
      name: 'Language offer setup',
      testMatch: ['/language-offer/auth.setup.ts'],
      // The Kratos flow occasionally stalls at "Preparing secure sign-in…";
      // the sign-in needs the same headroom as the walks themselves.
      timeout: 90_000,
      expect: { timeout: 15_000 },
    },
    {
      // The detection walks drive Config + session GraphQL through Traefik, so
      // they need far more headroom than the 30s/5s this config gives everything
      // else — the offer gate waits on config load plus reconciliation.
      // Viewport is pinned to the resolution the suite was validated at rather
      // than inheriting the global 1920×1080.
      name: 'Language offer',
      testMatch: ['/language-offer/*.spec.ts'],
      dependencies: ['Language offer setup'],
      timeout: 90_000,
      expect: { timeout: 15_000 },
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      // Feature 033 (chat avatars) — the US1/US2/US3 acceptance walks.
      //
      // No setup project and no shared persona state: each file registers the
      // accounts it needs, and deletes every one of them again in afterAll (by
      // the id captured at registration). A failed run therefore leaves the
      // environment as it found it, and a retry starts from a clean slate.
      //
      // Needs more headroom than the 30s/5s the rest of this config gives:
      // every scenario is a multi-user round trip through the live chat room —
      // send on one session, wait for the subscription push on another — and
      // US2 uploads and crops group photos on top of that.
      name: 'Chat avatars',
      testMatch: ['/chat-avatars/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // Story client-web#10033 / workspace#076 (expanded subspace cards) —
      // the four acceptance walks: rich cards, the "Expanded card" switch,
      // excerpt safety and the narrow layout. Each file seeds its own public
      // Space through the API and deletes it in afterAll; no dependencies.
      // The files set their own per-test budgets (describe.configure), since
      // their fixtures carry up to seven subspaces. US2 is the only
      // authenticated walk and turns trace/video off at file level.
      name: 'Subspaces callout',
      testMatch: ['/subspaces-callout/*.spec.ts'],
      expect: { timeout: 15_000 },
    },
    {
      // Story client-web#10178 (space-banner) — the default 10:1 gradient on
      // bannerless spaces/subspaces and the first-crop-opens-at-10:1 walk.
      // Self-seeding via TestScenarioFactory + its own session fixture, torn
      // down in afterAll; no dependencies. The crop walk uploads a generated
      // 1200×120 PNG and drives the crop dialog, so it gets more headroom
      // than the global 30s.
      name: 'Space banner',
      testMatch: ['/space-banner/*.spec.ts'],
      timeout: 60_000,
      expect: { timeout: 15_000 },
    },
    {
      // workspace#040-sidebar-widget-config (client-web#10092) — per-tab sidebar widgets:
      // US1 default rendering and US2 admin configuration. Each file seeds its own Space
      // through TestScenarioFactory, opens one isolated context per persona, runs serially
      // (describe.configure) and deletes the subspace, Space and organization in afterAll.
      // Trace/video are off at file level (admin sessions). US2-AS6 is `test.skip`ped pending
      // alkem-io/server#6571 (QA-PF-01) and stays the file's last test, so that once it is
      // un-skipped a red run cannot skip the tests after it in serial mode.
      name: 'Sidebar widgets',
      testMatch: ['/sidebar-widgets/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // workspace#024-classifications (epic alkem-io/alkemio#1985) — the Space-side
      // (US1/US3/REMOVAL) and template-side (US1/US2) acceptance walks. Each file seeds its
      // own Space through TestScenarioFactory (the Space suite adds one subspace), drives it
      // as the Space admin and a plain member, and deletes subspace, Space and organization
      // in afterAll. TL-01 carries two deliberate soft reds pending a product decision
      // (QA-PF-01, see classifications-test-plan.md).
      name: 'Classifications',
      testMatch: ['/classifications/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
      // A renamed control fails in seconds instead of burning the test budget.
      use: { actionTimeout: 15_000 },
    },
    {
      // Story client-web#10107 / workspace#054 (self-service account
      // deletion) — the portable delta after test-suites#620: TC-14 (the
      // notification centre survives the removed
      // InAppNotificationPayloadPlatformUserProfileRemoved fields), TC-15
      // (a departed user's activity attributes to the "Former member"
      // sentinel and the feed still loads) and TC-16 (the Delete-account
      // card is owner-only). Deliberately does NOT depend on any of #620's
      // loopback-only primitives (no DB/Redis access, no BFF session
      // minting) — every case is self-seeding (disposable Kratos identities
      // registered and deleted within the spec) and independent of shared
      // TestUserManager persona state, so it runs here alongside the other
      // nightly projects. TC-01/TC-02/TC-05/TC-18 (the API-level portable
      // cases) live in server-api's `nightly` vitest project instead —
      // `contributor-management` already covers that glob.
      name: 'Account deletion',
      testMatch: [
        '/account-deletion/profile-removed-notification.spec.ts',
        '/account-deletion/former-member-activity.spec.ts',
        '/account-deletion/account-deletion-visibility.spec.ts',
      ],
      timeout: 90_000,
      expect: { timeout: 15_000 },
    },
    {
      // Feature 038 (callout emoji reactions) — persisted P1 acceptance walk.
      //
      // The spec file lives outside the default testDir (src/functional-e2e/) in
      // tests/ because it is machine-generated by forge-verify and must survive
      // as-is across re-runs without colliding with hand-authored Playwright
      // suites. The stub ships as a skipped placeholder; forge-verify replaces
      // the body with the real walk after a green acceptance run.
      //
      // Self-seeding: the walk creates its own space + callouts + member account
      // and tears them down in afterAll, so it can run in isolation or alongside
      // the other nightly projects without shared state.
      name: 'Callout reactions',
      // testMatch alone cannot reach outside the top-level testDir
      // (src/functional-e2e), so the project needs its own testDir. Without it
      // this project collected ZERO tests and the nightly silently skipped it.
      testDir: path.resolve(__dirname, '../tests'),
      testMatch: ['callout-reactions.spec.ts'],
      timeout: 60_000,
      expect: { timeout: 10_000 },
    },
    {
      // Feature 041 (callout reaction NOTIFICATIONS) — persisted P1 acceptance
      // walk, same forge-verify shape as 038: machine-generated file in tests/,
      // self-seeding, torn down in afterAll. Needs more headroom than 038: the
      // negative assertions (AS4 self-suppression, AS2 swap) each hold a
      // multi-sample settle window on top of the positive 30s poll.
      name: 'Callout reaction notifications',
      // testMatch alone cannot reach outside the top-level testDir
      // (src/functional-e2e), so the project needs its own testDir.
      testDir: path.resolve(__dirname, '../tests'),
      testMatch: ['callout-reaction-notifications.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // Feature 061 (organization space invitations) — US1/US2/US3 acceptance
      // walks. Each file drives a full SPA invite flow (navigate, expand the
      // Member Organisations section, open the dialog, search, send, read the
      // result row) and several also hold a negative mail-window poll
      // (`assertNoMailTo`) on top of that, so the default 30s/5s budget is
      // not enough headroom — mirrors Chat avatars/Callout reaction
      // notifications above.
      name: 'Organization space invitations',
      testMatch: ['/organization-space-invitations/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // Feature 062 (organization user associates) — US1/US2/US3/US5/US7
      // acceptance walks. Same shape as the 061 entry above: the files drive
      // full SPA flows (Associates tab, row editor, invite dialog, profile
      // apply) with in-app / mailbox polls on top, so they need the same
      // extra headroom. Serial execution is not optional for them — every
      // file registers several Kratos identities through the shared
      // MailSlurper mailbox — and comes from this config's global
      // `workers: 1` / `fullyParallel: false` below plus each file's own
      // `describe.configure({ mode: 'serial' })`, exactly like the 061 walks.
      name: 'Organization user associates',
      testMatch: ['/organization-user-associates/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // Organization email invitations — US1/US2/US3 acceptance walks. Same
      // shape as the organization user associates entry above: full SPA flows (invite
      // dialog, pending tables, sign-up link) with mailbox polls and several
      // Kratos registrations on top, so the same extra headroom; serial
      // execution comes from this config's global `workers: 1` plus each
      // file's own `describe.configure({ mode: 'serial' })`.
      name: 'Organization email invitations',
      testMatch: ['/organization-email-invitations/*.spec.ts'],
      timeout: 180_000,
      expect: { timeout: 15_000 },
    },
    {
      // workspace#083 (organization leaves a Space, server#6560) — US1/US2
      // acceptance walks of Organization → Settings → Membership. Each file
      // seeds its own scenario through the API (invite + accept) and tears it
      // down in afterAll; both files are serial inside. Their beforeAll builds
      // one or two scenarios and several role changes, and the walks retry
      // navigation until the settings guard sees freshly granted roles, so
      // they need the same headroom as the organization entries above.
      name: 'Organization space membership',
      testMatch: ['/organization-space-membership/*.spec.ts'],
      timeout: 120_000,
      expect: { timeout: 15_000 },
    },
    {
      // Feature 070 (contribution notify switch) — persisted P1 acceptance
      // walk, same forge-verify shape as 038/041: machine-generated file in
      // tests/, self-seeding (its own org + space + response callout),
      // torn down in afterAll. Asserts at the RabbitMQ notifications-queue
      // publish counter rather than MailSlurper, guarded by
      // rabbitMqManagementConfigured() (the same checkPush pattern
      // organization-space-invitations/us2-org-admins-notified.spec.ts
      // uses) — this workflow sets no RABBITMQ_MANAGEMENT_* env, so nightly
      // skips the queue-counter checks and still runs the switch/UI/activity
      // assertions.
      name: 'Contribution notify switch',
      // testMatch alone cannot reach outside the top-level testDir
      // (src/functional-e2e), so the project needs its own testDir.
      testDir: path.resolve(__dirname, '../tests'),
      testMatch: ['contribution-notify-switch.spec.ts'],
      timeout: 90_000,
      expect: { timeout: 15_000 },
      // Traces/videos of this walk (which types the harness password) are
      // stripped from the public report by scripts/publish-report.sh like
      // every other project's, so no per-project opt-out is needed.
    },
    {
      // workspace#077 (richer contributor cards, client-web#10316). Every file
      // seeds its own public Space through the API and deletes it in
      // afterAll — no fixture is provisioned out of band. Files are serial
      // inside; the product-finding tests (QA-PF-01 client-web#10369,
      // QA-PF-03 client-web#10370) are test.skip'ped by the QA lead's decision
      // until those fixes ship, and sit last in their files so that once
      // un-skipped a red skips nothing else.
      // More headroom than 30s/5s: several cases open two or three browser
      // contexts (anonymous, non-member, member) or three timezones.
      //
      // The shipped 0.1contributors-callout.spec.ts is deliberately NOT
      // listed: its scenario cleanup lives only in the Member block, so any
      // failure in the Admin block restarts the worker and leaks a Space, an
      // Organization and a VC. It is red on QA-PF-01 today, so it would leak
      // on every nightly. Add it here once its cleanup moves to file level.
      name: 'Contributors callout',
      testMatch: [
        '/contributors-callout/us1-card-content.spec.ts',
        '/contributors-callout/us2-nothing-else-changes.spec.ts',
        '/contributors-callout/us3-card-menu.spec.ts',
        '/contributors-callout/us4-joined-this-space.spec.ts',
        '/contributors-callout/us5-organisation-website.spec.ts',
      ],
      timeout: 60_000,
      expect: { timeout: 10_000 },
    },
  ],
  // % or number of the available CPUs
  // workers: '100%',
  workers: 1,

  /*
    Playwright Test runs tests in parallel. In order to achieve that, it runs several worker processes that run at the same time.
    By default, test files are run in parallel. Tests in a single file are run in order, in the same worker process.
    You can configure entire test run to concurrently execute all tests in all files using this option.
   */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: true,

  retries: 2,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['github'], ['html', { open: 'never' }]],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Match the interactive config (playwright.config.ts): branded Chrome at
     * 1920×1080. Without this the nightly ran bundled Chromium at the default
     * 1280×720, where the sticky app header overlaps the calendar form's Save
     * button and intercepts the click (whole-day-events-crud T1 failed on every
     * nightly but passed at 1920×1080). Keep these in sync with the main config. */
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    viewport: { width: 1920, height: 1080 },

    /* Honours UI_HEADLESS like every other config in this repo
     * (playwright.config.ts, .language-offer, .planner). This one hardcoded
     * `true` while its own docblock above advertised the variable, so
     * `UI_HEADLESS=false` silently did nothing here — the one config where a
     * developer most often wants to watch a nightly spec run. */
    headless: process.env.UI_HEADLESS !== 'false',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-all-retries',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on retry */
    video: 'retain-on-failure',
  },

  timeout: 30000,

  expect: {
    timeout: 5000,
  },
});
