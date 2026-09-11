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
  timeout: (process.env.ALKEMIO_BASE_URL || '').includes('localhost') ? 30000 : 60000,
  expect: { timeout: 15000 },
  projects: [
    {
      name: 'Chromium (bundled)',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
