import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Forge verifier config for feature 029-detect-signup-language.
// Deliberately has NO globalSetup: the default global-setup calls
// registerAllTestUsers() which requires the server's non-interactive-login
// endpoint — DISABLED on this stack. These specs authenticate through the
// Kratos browser UI instead, and the anonymous specs need no auth at all.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  testDir: path.resolve(__dirname, '..', 'src', 'functional-e2e', 'language-offer'),
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
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1440, height: 900 } },
    },
  ],
});
