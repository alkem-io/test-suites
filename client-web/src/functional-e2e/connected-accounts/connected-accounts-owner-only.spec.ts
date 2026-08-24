// spec: workspace#051-cleverbase-account-linking — owner-only access
// Case: CA-06 (E4-owner-only-even-for-admin).
//
// A platform admin hitting ANOTHER user's /settings/security is redirected to
// that user's settings profile; Connected Accounts never mounts and no Kratos
// settings flow is ever created. The visual "no flash" judgement of the
// manual walk is covered here by its strongest deterministic form: the
// settings-flow request collector — the flow hook is mounted only behind the
// isOwner gate (CrdUserSecurityTab), so zero '/self-service/settings'
// requests proves the section never mounted. The success-path counterpart
// (the owner DOES see the tab) is CA-01.

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  escapeRegExp,
  resolveProfileUrlFor,
  securitySettingsUrlFrom,
} from './connected-accounts.pages';
import { settingsFlowRequestCollector } from './kratos-settings-mock.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

// A real platform admin (globalAdmin in the harness).
const test = createPersonaTest('admin@alkem.io');

test.describe('Connected Accounts — owner-only, even for a platform admin', () => {
  test("CA-06: admin on another user's security URL is redirected; no settings flow is created", async ({
    page,
    browser,
  }) => {
    test.setTimeout(60_000);

    // Resolve the TARGET user's profile URL at runtime with that persona's
    // own cached session (read-only GraphQL me query) — never a hardcoded
    // /user/<slug> path, which the shared dev DB does not guarantee.
    const targetProfileUrl = await resolveProfileUrlFor(browser, 'qa.user@alkem.io');
    const targetSecurityUrl = securitySettingsUrlFrom(targetProfileUrl);
    const targetProfilePath = new URL(targetProfileUrl, baseUrl).pathname;

    // Armed BEFORE navigation: collects every Kratos settings-flow request.
    const settingsFlowRequests = settingsFlowRequestCollector(page);

    await page.goto(targetSecurityUrl);

    // Second-pass owner redirect lands on the target user's settings profile.
    await expect(page).toHaveURL(
      new RegExp(`${escapeRegExp(targetProfilePath)}/settings/profile`),
      { timeout: 20_000 }
    );

    // The Connected Accounts section never mounted…
    await expect(page.getByRole('heading', { name: COPY.sectionTitle, exact: true })).toHaveCount(0);
    // …and no Kratos settings flow was ever created — the programmatic
    // "no flash" signal (assert AFTER the redirect settled, so any request a
    // premature mount would have fired is already in the collector).
    expect(settingsFlowRequests).toHaveLength(0);
  });
});
