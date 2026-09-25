import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for workspace#027 — the platform role redesign.
//
//   pnpm run test:platform-roles          (from client-web/)
//
// These walks need a stack running the 027 SERVER AND CLIENT, so they are kept
// out of the default suite (`playwright.config.ts` ignores the folder) and out
// of the nightly, exactly like the language-offer walks: on any other stack
// every one of them would fail at seeding.
//
// No project-wide globalSetup: each spec seeds the 14 single-role users through
// the shared `seedPlatformRoleUsers()` (tests-lib) — idempotent, ~15 sign-ins
// once seeded — so the UI suite never depends on the API suite having run first.
// Each role logs in ONCE per worker via the persona fixture.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  testDir: path.resolve(__dirname, '..', 'src', 'functional-e2e'),
  // The rewritten authz-admin-guard spec exercises the same Authorization page
  // and shares the 027 precondition, so it runs here too.
  testMatch: ['**/platform-roles/**/*.spec.ts', '**/authz-admin-guard/platform-global-roles.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-platform-roles' }]],
  use: {
    baseURL: process.env.ALKEMIO_BASE_URL || 'http://localhost:3000',
    // Off on purpose: this repo is public and reports get published; a trace
    // embeds request bodies and bearer tokens.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    headless: process.env.UI_HEADLESS !== 'false',
  },
  timeout: 60_000,
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
  ],
});
