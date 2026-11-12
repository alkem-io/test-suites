import { defineConfig } from '@playwright/test';
import { baseConfig, suite } from './playwright.shared';

// Runner config for the second-factor (Kratos MFA) walks.
//
//   pnpm exec playwright test -c config/playwright.config.second-factor.ts   (from client-web/)
//
// Needs a stack booted with the feature's Kratos values, the Kratos admin API
// (`KRATOS_ADMIN_URL`) and loopback Redis/Postgres: every walk creates and
// deletes its own identities, clears the login proxy's per-address counters,
// and ages an organisation rule by SQL. So the folder is kept out of the
// default suite (`playwright.config.ts` ignores it) and out of the nightly.
//
// One worker, files in sequence: every walk signs in from the runner's one
// address (one counter at the login proxy) and the rule state is shared.
// No screenshot, trace or video: the authenticator secret, its QR code and the
// recovery codes are on screen in these walks, and reports get published.
// For the same reason no page snapshot either: Playwright writes one into the
// report (error-context) for every failing test that still has a page open.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';

export default defineConfig({
  ...baseConfig({
    globalSetup: './global-setup.second-factor.ts',
    reportFolder: 'playwright-report-second-factor',
    projects: [
      suite({
        name: 'Second factor',
        testMatch: ['**/second-factor/**/*.spec.ts'],
        tier: 'long',
        capture: 'off',
        use: { screenshot: 'off', trace: 'off', video: 'off' },
      }),
    ],
  }),
  workers: 1,
});
