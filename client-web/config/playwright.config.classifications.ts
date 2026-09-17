import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Runner config for the 024-classifications acceptance suites
// (src/functional-e2e/classifications/).
//
// Both suites mutate the SAME live shared Space (/eco1): the space-lifecycle
// file and the templates-library file each create/delete entries and
// space-library templates, and each carries a file-level afterAll leak sweep.
// Running them in parallel — with each other or with themselves sharded across
// workers — lets one worker's sweep destroy another worker's in-flight state
// and breaks the relative-count / pre-post-diff baselines (TL-03, TL-04,
// TL-06). `workers: 1` + `fullyParallel: false` here make exclusive execution
// the enforced default rather than an optional CLI flag; the spec files
// additionally pin `test.describe.configure({ mode: 'default' })` so even a
// stray run through the default config keeps each file on one worker.
// The default config excludes this directory (testIgnore), mirroring the
// language-offer precedent.
//
// Invocation (from client-web/):  pnpm run test:classifications
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const testDirectory = path.resolve(__dirname, '..', 'src', 'functional-e2e', 'classifications');

export default defineConfig({
  // The suites' personas rely on globalSetup clearing stale `.auth/persona.*`
  // sessions so on-disk state reuse stays strictly run-scoped.
  globalSetup: './global-setup.ts',
  testDir: testDirectory,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-classifications' }]],
  use: {
    trace: 'on-first-retry',
    headless: process.env.UI_HEADLESS !== 'false',
  },
  // Mirrors the default config; every scenario sets its own larger budget.
  timeout: (process.env.ALKEMIO_BASE_URL || '').includes('localhost') ? 30000 : 60000,
  // Keep the fast default — mutation-anchored assertions carry explicit
  // per-assertion timeouts in the suite helpers instead.
  expect: {
    timeout: 10 * 500,
  },
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 } },
    },
  ],
});
