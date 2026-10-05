import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for workspace#080 — the Form callout framing acceptance walks.
//
//   pnpm run test:form-callout-framing          (from client-web/)
//
// The walks provision their own throwaway identities through the Kratos ADMIN
// API, so they need `KRATOS_ADMIN_URL` (empty on an ordinary local stack) and
// the platform admin's password (`ALKEMIO_ADMIN_PASSWORD`). Without them every
// walk fails in `beforeAll`, so — like the 027 and 029 walks — the folder is
// kept out of the default suite (`playwright.config.ts` ignores it) and out of
// the nightly. No globalSetup: the walks never use the harness personas.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  testDir: path.resolve(
    __dirname,
    '..',
    'src',
    'functional-e2e',
    'form-callout-framing'
  ),
  // Each file is serial and every walk signs the shared platform admin in;
  // one worker keeps the login endpoint below its rate limit.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    [
      'html',
      { open: 'never', outputFolder: 'playwright-report-form-callout-framing' },
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
  // The walks set their own 300 s test timeout; the expect timeout matches the
  // default suite the walks were verified under.
  expect: { timeout: 5_000 },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
