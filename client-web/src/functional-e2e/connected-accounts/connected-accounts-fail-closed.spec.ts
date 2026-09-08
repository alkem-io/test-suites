// spec: workspace#051-cleverbase-account-linking — fail-closed contract
// Case: CA-04 (R5-fail-closed-when-methods-unreadable).
//
// Persona: space.member@alkem.io. Kratos is never actually stopped — the
// walk's sanctioned fallback (request-level failure injection) is used
// instead, so nothing infrastructural breaks parallel tests. MECHANISM
// PINNED: a test-scoped state flag consulted on EVERY request fails ALL
// settings-flow requests (browser init, flows?id, action — useKratosFlow's
// returnTo-settling double-kickoff and StrictMode double effects make the
// per-mount request count indeterminate, so call counting is banned) until
// the test flips it AFTER the fail-closed asserts complete.

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  connectButton,
  resolveOwnSecurityUrl,
  sectionCard,
} from './connected-accounts.pages';
import { interceptSettingsFlowReads, SettingsFlowRoutingState } from './kratos-settings-mock.fixture';

const test = createPersonaTest('space.member@alkem.io');

type SentinelWindow = { __ca04Sentinel?: boolean };

test.describe('Connected Accounts — fail closed when the settings flow is unreadable', () => {
  test('CA-04: explicit error state with retry and ZERO provider rows; retry recovers in place', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const flowState: SettingsFlowRoutingState = { failAll: true };
    await interceptSettingsFlowReads(page, flowState);

    // Resolved via page.request — which bypasses page.route, so the failure
    // injection above cannot break the URL resolution.
    await page.goto(await resolveOwnSecurityUrl(page));

    // Phase 1 — fail-closed: the explicit unavailable notice (role='alert')…
    await expect(
      sectionCard(page).getByRole('alert').getByText(COPY.unavailableMessage, { exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      sectionCard(page).getByRole('button', { name: COPY.unavailableRetry, exact: true })
    ).toBeVisible();
    // …and NOTHING claimed connected or not connected: zero rows of any kind.
    await expect(sectionCard(page).getByRole('listitem')).toHaveCount(0);
    await expect(page.getByText(COPY.notConnected, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Connect LinkedIn', exact: true })).toHaveCount(0);

    // Phase 2 — recovery without a page reload. The window sentinel survives
    // only if retry refetched in place (a full reload would wipe it).
    await page.evaluate(() => {
      (window as SentinelWindow).__ca04Sentinel = true;
    });
    flowState.failAll = false;
    await sectionCard(page).getByRole('button', { name: COPY.unavailableRetry, exact: true }).click();

    // Live Kratos now serves the flow: true state renders.
    await expect(connectButton(page, 'LinkedIn')).toBeVisible({ timeout: 20_000 });
    expect(await page.evaluate(() => (window as SentinelWindow).__ca04Sentinel)).toBe(true);
  });
});
