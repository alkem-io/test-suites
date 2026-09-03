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

    headless: true,

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
