import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for the 024-classifications acceptance walks
// (src/functional-e2e/classifications/) — the same suites the nightly
// `Classifications` project runs, on their own for a quick local check.
//
// Each spec file seeds and deletes its own Space, so the two files run in
// parallel; inside a file the tests run in declaration order on one worker
// (`describe.configure({ mode: 'default' })`).
//
// Invocation (from client-web/):  pnpm run test:classifications
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const testDirectory = path.resolve(
  __dirname,
  '..',
  'src',
  'functional-e2e',
  'classifications'
);

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: testDirectory,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 2,
  reporter: [
    ['list'],
    [
      'html',
      { open: 'never', outputFolder: 'playwright-report-classifications' },
    ],
  ],
  use: {
    trace: 'on-first-retry',
    headless: process.env.UI_HEADLESS !== 'false',
    // A renamed control fails in seconds instead of burning the test budget.
    actionTimeout: 15_000,
  },
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});
