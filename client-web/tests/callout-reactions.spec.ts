/**
 * Persisted P1 acceptance spec for callout emoji reactions (038).
 *
 * This file is the landing target for the forge acceptance walk:
 *   repos.yaml → verification.acceptance.US1.persist_spec_to
 *
 * The passing walk is written by forge-verify after a green acceptance run.
 * Until then this stub keeps the suite file present so the Playwright project
 * entry in playwright.config.nightly.ts (and CI) resolves without error.
 *
 * What will be verified once forge-verify fills this in:
 *   US1-AS1  member reacts → chip + total 1, own choice primary-tinted
 *   US1-AS2  picker shows exactly the 7 predefined emojis
 *   US1-AS3  two members → both chips + single combined total 2, no per-emoji number
 *   US1-AS4  direct API calls with '1', '#', '*', off-list → validation error
 *   US1-AS5  member reacts on POST-only and WHITEBOARD-only callouts → both succeed
 *
 * Run standalone (after forge-verify fills the walk):
 *   cd client-web
 *   pnpm exec playwright test tests/callout-reactions.spec.ts
 *
 * Run via the nightly suite:
 *   pnpm --filter @alkemio/test-suite-client-web run test:nightly --project="Callout reactions"
 */

import { test } from '@playwright/test';

test.describe.skip('Callout emoji reactions — P1 acceptance walk (pending forge-verify)', () => {
  test('placeholder — forge-verify persists the real walk here', () => {
    // This test body is replaced by the forge acceptance walk.
    // The skip decorator keeps the nightly green while the walk is pending.
  });
});
