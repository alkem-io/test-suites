import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for feature 029-detect-signup-language.
//
// The suite mixes anonymous walks (no auth at all — each test needs a virgin
// cookie jar) with authenticated ones, and drives a different browser `locale`
// per file, so authentication cannot come from a project-wide `storageState`.
// Instead an `auth-setup` project logs each persona in ONCE and persists the
// session to `.auth/`; the authenticated specs opt in with
// `test.use({ storageState })` (see authState.ts).
//
// globalSetup (registerAllTestUsers) is intentionally not run here: these walks
// use seeded personas only and never create harness users.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const testDirectory = path.resolve(__dirname, '..', 'src', 'functional-e2e', 'language-offer');

export default defineConfig({
  testDir: testDirectory,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-language-offer' }]],
  use: {
    baseURL: process.env.ALKEMIO_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: process.env.UI_HEADLESS !== 'false',
  },
  // Detection scenarios drive Config + session GraphQL through Traefik; give the
  // SPA cold-load and Kratos redirects room to settle.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      // Every spec depends on this project, so a single flaky sign-in would skip
      // the whole suite. The Kratos flow occasionally stalls at "Preparing secure
      // sign-in…" (the flow-init request never resolves) — retry rather than lose
      // the run. Only the sign-in is retried; the walks themselves stay at 0.
      retries: 2,
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'Google Chrome',
      testIgnore: /auth\.setup\.ts/,
      dependencies: ['auth-setup'],
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
  ],
});
