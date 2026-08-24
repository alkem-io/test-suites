// spec: workspace#051-cleverbase-account-linking — Connect round-trip prefix
// Cases: CA-20 (G2-connect-provider, deterministic prefix),
//        CA-21 (R2-abandon-at-provider, abandon-by-navigation leg).
//
// Persona: subspace.admin@alkem.io — deliberately NOT non.space@alkem.io,
// whose password the legacy authentication-password-recovery.spec.ts
// temporarily changes mid-run (a cold persona login racing that window would
// flake this whole file), and NOT a persona any other spec credential-mutates.
//
// Live Kratos serves the settings flow; only the native POST to the flow's
// own action URL is intercepted with an inert same-origin page, so the exact
// Kratos link-flow contract (link=<provider> + CSRF + flow id) is asserted
// without ever leaving localhost. The real provider round trip + success
// notice stay manual (see the QA plan's manualOnly section).

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  connectButton,
  credentialRow,
  providerRow,
  resolveOwnSecurityUrl,
  sectionCard,
} from './connected-accounts.pages';
import {
  interceptOidcRedirect,
  oauthInterceptedBody,
  providerHostCollector,
  readOutcomeMarker,
} from './kratos-settings-mock.fixture';

const test = createPersonaTest('subspace.admin@alkem.io');

test.describe('Connected Accounts — Connect deterministic prefix', () => {
  test('CA-20: Connect LinkedIn natively POSTs link=linkedin + CSRF to the flow action and writes the outcome marker', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await interceptOidcRedirect(page);
    const providerHits = providerHostCollector(page);

    const securityUrl = await resolveOwnSecurityUrl(page);
    await page.goto(securityUrl);
    await expect(connectButton(page, 'LinkedIn')).toBeVisible({ timeout: 15_000 });

    // Arm BEFORE clicking — the click triggers a full-page navigation POST.
    const postPromise = page.waitForRequest(
      request =>
        request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/self-service/settings'),
      { timeout: 20_000 }
    );

    await connectButton(page, 'LinkedIn').click();
    await expect(oauthInterceptedBody(page)).toBeVisible({ timeout: 20_000 });

    // The exact Kratos link-flow contract.
    const request = await postPromise;
    const postData = request.postData() ?? '';
    expect(postData).toContain('link=linkedin');
    expect(postData).toMatch(/csrf_token=[^&]+/);
    expect(new URL(request.url()).searchParams.get('flow')).toBeTruthy();

    // The whole interaction happened without any provider contact.
    expect(providerHits).toHaveLength(0);

    // The outcome marker was written synchronously before navigation; the
    // inert page is same-origin, so it shares the app's sessionStorage.
    const marker = await readOutcomeMarker(page);
    expect(marker?.action).toBe('link');
    expect(marker?.provider).toBe('linkedin');
  });

  test("CA-21: returning after an interrupted Connect announces \"Couldn't connect LinkedIn — try again.\" once, Connect re-offered", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // SELF-CONTAINED: this test performs its own interrupted Connect —
    // sessionStorage never travels via storageState, so no other test could
    // supply the marker, and no ordering coupling exists under fullyParallel.
    await interceptOidcRedirect(page);
    const providerHits = providerHostCollector(page);

    const securityUrl = await resolveOwnSecurityUrl(page);

    // Step 1 — the interrupted Connect (writes the marker in THIS context).
    await page.goto(securityUrl);
    await expect(connectButton(page, 'LinkedIn')).toBeVisible({ timeout: 15_000 });
    await connectButton(page, 'LinkedIn').click();
    await expect(oauthInterceptedBody(page)).toBeVisible({ timeout: 20_000 });

    // Step 2 — abandon by navigating back: a fresh settings flow is
    // provisioned (init GET passes through to live Kratos), Kratos carries no
    // flow message, and the consumed marker resolves to 'failed'.
    await page.goto(securityUrl);

    // Message assert FIRST, right after the section reaches ready. The notice
    // is the section's persistent inline FlowMessage (role='alert' for the
    // error type), asserted by exact copy and exactly-once.
    const failureNotice = page.getByText(COPY.connectFailed('LinkedIn'), { exact: true });
    await expect(failureNotice).toBeVisible({ timeout: 20_000 });
    await expect(failureNotice).toHaveCount(1);
    await expect(sectionCard(page).getByRole('alert').filter({ hasText: COPY.connectFailed('LinkedIn') })).toBeVisible();

    // Retry offered, nothing changed.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
    await expect(credentialRow(page, 'Password').getByText('Set', { exact: true })).toBeVisible();

    // Still zero provider contact across both steps.
    expect(providerHits).toHaveLength(0);
  });
});
