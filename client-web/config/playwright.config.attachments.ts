import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'node:path';

// workspace#082 T002. Fixtures are explicitly provisioned on a disposable
// stack; never run shared-persona globalSetup or start/reset a stack here.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

export default defineConfig({
  testDir: path.resolve(__dirname, '../src/functional-e2e/attachments'),
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: path.resolve(__dirname, '../test-results/attachments'),
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: path.resolve(__dirname, 'playwright-report-attachments'),
      },
    ],
  ],
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    headless: process.env.UI_HEADLESS !== 'false',
    // Reports must not capture login bodies, Matrix tokens or upload receipts.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
