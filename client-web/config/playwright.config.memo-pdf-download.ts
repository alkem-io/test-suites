import { defineConfig } from '@playwright/test';
import { baseConfig, suite } from './playwright.shared';

// Runner config for the memo PDF download acceptance walks.
//
//   pnpm run test:memo-pdf-download          (from client-web/)
//
// The access walk provisions its own throwaway identities through the Kratos
// ADMIN API (`KRATOS_ADMIN_URL`, `ALKEMIO_ADMIN_PASSWORD`) and the download walk
// needs a stack running the memo PDF export, so the folder is kept out of the
// default suite (`playwright.config.ts` ignores it) and out of the nightly.
// The download walk signs in as the harness personas (space.member, space.admin,
// the platform admin), so the shared globalSetup registers them and clears stale
// persona sessions; the access walk provisions its own identities.
//
// Long tier: provisioning (identities, Spaces, memos) and a PDF render per walk
// wait on the platform; each spec raises its tests and hooks to 300 s.
// Capture off: this repo is public and reports get published; a trace embeds
// request bodies and bearer tokens.
export default defineConfig(
  baseConfig({
    globalSetup: './global-setup.ts',
    reportFolder: 'playwright-report-memo-pdf-download',
    projects: [
      suite({
        name: 'Memo PDF download',
        testMatch: ['/memo-pdf-download/*.spec.ts'],
        tier: 'long',
        capture: 'off',
      }),
    ],
  })
);
