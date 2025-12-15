import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({ path: path.resolve(__dirname, '../', '.env') });

/**
 * Playwright configuration for running tests matching specific patterns.
 *
 * Usage examples:
 *
 * 1. Run all seed tests:
 *    npx playwright test --config=playwright.pattern.config.ts --grep "seed"
 *
 * 2. Run tests in a specific directory:
 *    npx playwright test --config=playwright.pattern.config.ts authentication/
 *
 * 3. Run tests matching a pattern in filename:
 *    npx playwright test --config=playwright.pattern.config.ts seed*.spec.ts
 *
 * 4. Run tests with specific tag (if using @tag in test names):
 *    npx playwright test --config=playwright.pattern.config.ts --grep "@smoke"
 *
 * 5. Exclude certain tests:
 *    npx playwright test --config=playwright.pattern.config.ts --grep-invert "slow"
 *
 * 6. Combine patterns:
 *    npx playwright test --config=playwright.pattern.config.ts --grep "authentication" --grep-invert "skip"
 *
 * Environment variables:
 * - TEST_PATTERN: Regex pattern to match test files (e.g., "seed|authentication")
 * - TEST_DIR: Subdirectory to run tests from (default: ./src/functional-e2e)
 * - UI_HEADLESS: Set to 'false' to run tests in headed mode
 */
// the testing directory relative to this config file
const testDirectory = '../src/functional-e2e';
const testPattern = [
  '/authentication/authentication-critical-flows.spec.ts',
  '/authentication/authentication-flows.spec.ts',
  // '/space/organization-space-create.spec.ts',
  // '/space/space-create.spec.ts',
]

export default defineConfig({
  testDir: testDirectory,
  // testDir: '../src/functional-e2e',
  testMatch: testPattern,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: true,

  retries: 1,

  // % of the available CPUs
  // workers: '100%',
  workers: '100%',

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['github'],
    ['html', { open: 'never' }],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    // trace: 'on-first-retry',
    headless: true,

    /* Screenshot on failure */
    // screenshot: 'only-on-failure',

    /* Video on retry */
    // video: 'retain-on-failure',
  },

  timeout: 30000,

  expect: {
    timeout: 10 * 500,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Uncomment to test on WebKit
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Uncomment to use branded Chrome
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});

