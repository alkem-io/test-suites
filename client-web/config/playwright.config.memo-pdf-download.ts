import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for the memo PDF download acceptance walks.
//
//   pnpm run test:memo-pdf-download          (from client-web/)
//
// The access walk provisions its own throwaway identities through the Kratos
// ADMIN API (`KRATOS_ADMIN_URL`, `ALKEMIO_ADMIN_PASSWORD`) and the download walk
// needs a stack running the memo PDF export, so the folder is kept out of the
// default suite (`playwright.config.ts` ignores it) and out of the nightly.
// The download walk signs in as the harness personas (space.member, space.admin,
// the platform admin), so the shared globalSetup registers them and clears stale
// persona sessions; the access walk provisions its own identities.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: path.resolve(
    __dirname,
    '..',
    'src',
    'functional-e2e',
    'memo-pdf-download'
  ),
  // Every walk signs the shared platform admin in; one worker keeps the login
  // endpoint below its rate limit.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    [
      'html',
      { open: 'never', outputFolder: 'playwright-report-memo-pdf-download' },
    ],
  ],
  use: {
    // Off on purpose: this repo is public and reports get published; a trace
    // embeds request bodies and bearer tokens.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
    headless: process.env.UI_HEADLESS !== 'false',
  },
  // Provisioning (identities, Spaces, memos) and a PDF render per walk run
  // well past the 30 s default test timeout.
  timeout: 300_000,
  // The expect timeout matches the default suite the walks were verified under.
  expect: { timeout: 5_000 },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
