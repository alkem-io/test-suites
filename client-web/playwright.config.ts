import { defineConfig } from '@playwright/test';
import { baseConfig, resolveBrowser } from './config/playwright.shared';

/**
 * The interactive runner — what `pnpm exec playwright test <file>` uses while
 * you develop a spec. Same browser presets, timeout tiers and artifact policy
 * as the nightly (`config/playwright.shared.ts`); the only differences are
 * that every spec under `src/functional-e2e` is in scope, and files may run in
 * parallel (`PW_WORKERS`) because you choose which files to run.
 *
 * Suites with their own runner (an extra setup project, a stack precondition)
 * are listed in `testIgnore` and run through `config/playwright.config.<suite>.ts`.
 */
const { key, use } = resolveBrowser();

export default defineConfig({
  ...baseConfig({
    globalSetup: './config/global-setup.ts',
    reportFolder: 'playwright-report',
    projects: [{ name: key, use }],
    parallelFiles: true,
  }),
  testIgnore: [
    // Needs its own sign-in setup project: config/playwright.config.language-offer.ts
    '**/language-offer/**',
    // Needs a stack running the 027 server AND client: config/playwright.config.platform-roles.ts
    '**/platform-roles/**',
    // Needs the Kratos admin API and the admin password: config/playwright.config.form-callout-framing.ts
    '**/form-callout-framing/**',
    // Needs the Kratos admin API and a stack with the memo PDF export: config/playwright.config.memo-pdf-download.ts
    '**/memo-pdf-download/**',
  ],
});
