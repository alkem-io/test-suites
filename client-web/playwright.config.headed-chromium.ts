/**
 * LOCAL, UNTRACKED runner override: identical to playwright.config.ts except the
 * browser project uses Playwright's bundled Chromium instead of `channel: 'chrome'`
 * (real Google Chrome is not installed on this workstation). Delete when Chrome is
 * installed via `sudo pnpm exec playwright install chrome`.
 */
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  globalSetup: './config/global-setup.ts',
  testDir: './src/functional-e2e',
  testIgnore: '**/language-offer/**',
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    headless: false,
  },
  // The organization-associates specs register ~10 Kratos personas and 3
  // organizations in beforeAll; a hook inherits this timeout and 30s is not
  // close to enough. `baseTest.setTimeout()` inside the hook does not raise it.
  timeout: 300000,
  expect: { timeout: 20000 },
  projects: [
    {
      name: 'Chromium (bundled)',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
