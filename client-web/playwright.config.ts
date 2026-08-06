import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  globalSetup: './config/global-setup.ts',
  testDir: './src/functional-e2e',
  /* forge-acceptance specs are durable regression cover for /forge acceptance
   * walks (tag @forge-acceptance). They need a live, seeded acceptance stack
   * and are not part of the default gate — run explicitly via
   * `PLAYWRIGHT_INCLUDE_FORGE_ACCEPTANCE=1 playwright test --grep @forge-acceptance`.
   *
   * qual-ts-1 (2026-07-30 fix wave, second pass): a plain `testIgnore` drops
   * matching files at COLLECTION time, before any `--grep` runs, so the
   * originally-documented `--grep @forge-acceptance` command collected zero
   * of these specs regardless of what was grepped for. The first attempted
   * fix — dropping `testIgnore` for a default `grepInvert: /@forge-acceptance/`
   * on the assumption that an explicit CLI `--grep` replaces it — was ALSO
   * wrong: verified empirically (`playwright test --list --grep
   * @forge-acceptance`) that Playwright applies `grep` and `grepInvert`
   * together (AND), not "last one wins" — with `grepInvert` set in config, an
   * explicit `--grep` still found ZERO tests. Gating `testIgnore` itself
   * behind an env var is the one mechanism that actually works: unset (the
   * default gate) excludes these files at collection exactly as before;
   * setting the flag lifts the ignore so `--grep @forge-acceptance` can then
   * select them by tag, verified to return all three files' tests. */
  testIgnore: process.env.PLAYWRIGHT_INCLUDE_FORGE_ACCEPTANCE
    ? undefined
    : '**/*.forge-acceptance.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    headless: process.env.UI_HEADLESS !== 'false',
  },
  timeout: (process.env.ALKEMIO_BASE_URL || '').includes('localhost') ? 30000 : 60000,

  expect: {
    timeout: 10 * 500,
  },

  /* Configure projects for major browsers */
  projects: [
    // {
    //   name: 'chromium',
    //   use: { ...devices['Desktop Chrome'] },
    // },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 } },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
