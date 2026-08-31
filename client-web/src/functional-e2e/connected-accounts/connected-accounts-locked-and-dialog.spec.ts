// spec: workspace#051-cleverbase-account-linking — locked rows + destructive guard
// Cases: CA-03 (R3-last-method-locked), CA-07 (R3 + E6-locked-then-cured-then-unlocked),
//        CA-30 / CA-31 (G4-disconnect-with-second-method).
//
// Persona: beta.tester@alkem.io. Connected / connected-locked states are
// synthesized by mocking the Kratos settings-flow READS (crafted flow JSON)
// and the UserSecurityAuthenticationMethods GraphQL operation — no real
// identity is touched anywhere, which keeps this file fully parallel-safe.
// Both mocks consult caller-owned state objects on EVERY request (never call
// counters — StrictMode + useKratosFlow's returnTo re-kickoff make per-mount
// request counts indeterminate).
//
// The live legs — a genuine social-only account, real passkey registration,
// a real disconnect completing — stay manual (see the QA plan's manualOnly).

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  confirmDialog,
  connectButton,
  dialogCancelButton,
  dialogConfirmButton,
  disconnectTrigger,
  lockedDisconnectButton,
  providerRow,
  resolveOwnSecurityUrl,
} from './connected-accounts.pages';
import { mockAuthenticationMethods } from './graphql-auth-methods-mock.fixture';
import {
  buildSettingsFlow,
  interceptOidcRedirect,
  interceptSettingsFlowReads,
  oauthInterceptedBody,
  providerHostCollector,
  readOutcomeMarker,
  SettingsFlowRoutingState,
} from './kratos-settings-mock.fixture';

const test = createPersonaTest('beta.tester@alkem.io');

/** Flow for the locked scenario: link nodes for microsoft + linkedin, NO github node at all. */
const lockedFlow = () =>
  buildSettingsFlow({
    providerNodes: [
      { provider: 'microsoft', action: 'link' },
      { provider: 'linkedin', action: 'link' },
    ],
  });

/** Flow for the cured scenario: github now carries an unlink node. */
const curedFlow = () =>
  buildSettingsFlow({
    providerNodes: [
      { provider: 'microsoft', action: 'link' },
      { provider: 'linkedin', action: 'link' },
      { provider: 'github', action: 'unlink' },
    ],
  });

/** Flow for the disconnect scenario: linkedin connected (unlink), others linkable. */
const disconnectableFlow = () =>
  buildSettingsFlow({
    providerNodes: [
      { provider: 'microsoft', action: 'link' },
      { provider: 'linkedin', action: 'unlink' },
      { provider: 'github', action: 'link' },
    ],
  });

test.describe('Connected Accounts — last-method lock and disconnect guard', () => {
  test('CA-03: locked row shows Connected with a focusable aria-disabled Disconnect carrying its reason', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const flowState: SettingsFlowRoutingState = { flow: lockedFlow() };
    await interceptSettingsFlowReads(page, flowState);
    await mockAuthenticationMethods(page, { methods: ['GITHUB'] });

    await page.goto(await resolveOwnSecurityUrl(page));

    const githubRow = providerRow(page, 'GitHub');
    // Exact 'Connected' — never /connected/i, which also matches 'Not connected'.
    await expect(githubRow.getByText(COPY.connected, { exact: true })).toBeVisible({ timeout: 15_000 });

    // The locked control has no aria-label — its accessible name is the bare
    // visible 'Disconnect'. Reachable-but-blocked: aria-disabled, focusable.
    const locked = lockedDisconnectButton(page, 'GitHub');
    await expect(locked).toHaveAttribute('aria-disabled', 'true');
    await locked.focus();
    await expect(locked).toBeFocused();
    await expect(locked).toHaveAttribute('aria-describedby', 'connected-accounts-github-locked-reason');

    // The cure-naming reason is visible on its own, exactly once.
    const reason = page.getByText(COPY.lockedReason, { exact: true });
    await expect(reason).toBeVisible();
    await expect(reason).toHaveCount(1);

    // Visibly distinct from a not-connected row: LinkedIn simultaneously shows
    // 'Not connected' with an ENABLED Connect button (no aria-disabled).
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('CA-07: curing the lock flips the same row from aria-disabled to an enabled Disconnect after reload', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    // One state object per mock, consulted on every request; the test flips
    // them AFTER the locked-phase asserts complete — never a call counter.
    const flowState: SettingsFlowRoutingState = { flow: lockedFlow() };
    const authState = { methods: ['GITHUB'] };
    await interceptSettingsFlowReads(page, flowState);
    await mockAuthenticationMethods(page, authState);

    await page.goto(await resolveOwnSecurityUrl(page));

    // Locked phase (minimal re-assert of CA-03's core).
    await expect(providerRow(page, 'GitHub').getByText(COPY.connected, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(lockedDisconnectButton(page, 'GitHub')).toHaveAttribute('aria-disabled', 'true');

    // Cure: the server state now carries a second method (password added) and
    // the flow offers github's unlink node. The walk expects a reload between
    // cure and unlock — live unlocking is not required.
    flowState.flow = curedFlow();
    authState.methods = ['EMAIL', 'GITHUB'];
    await page.reload();

    // The enabled unlink control carries the disconnectAria aria-label —
    // accessible name 'Disconnect GitHub' — and no aria-disabled.
    await expect(disconnectTrigger(page, 'GitHub')).toBeVisible({ timeout: 15_000 });
    await expect(disconnectTrigger(page, 'GitHub')).not.toHaveAttribute('aria-disabled', 'true');
    await expect(providerRow(page, 'GitHub').getByText(COPY.connected, { exact: true })).toBeVisible();
    // The locked reason is gone.
    await expect(page.getByText(COPY.lockedReason, { exact: true })).toHaveCount(0);
  });

  test('CA-30: disconnect requires the confirm dialog; confirming POSTs unlink=linkedin with zero provider contact', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const flowState: SettingsFlowRoutingState = { flow: disconnectableFlow() };
    await interceptSettingsFlowReads(page, flowState);
    await mockAuthenticationMethods(page, { methods: ['EMAIL', 'LINKEDIN'] });
    await interceptOidcRedirect(page);
    const providerHits = providerHostCollector(page);

    await page.goto(await resolveOwnSecurityUrl(page));

    await expect(disconnectTrigger(page, 'LinkedIn')).toBeVisible({ timeout: 15_000 });
    await disconnectTrigger(page, 'LinkedIn').click();

    // The destructive guard precedes the action. Every dialog lookup is
    // scoped to role=alertdialog — the row trigger ('Disconnect LinkedIn')
    // stays in the DOM behind the overlay, so an unscoped {name:'Disconnect'}
    // would be a strict-mode violation (name matching is substring-based).
    const dialog = confirmDialog(page);
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('heading', { name: COPY.confirmDisconnectTitle('LinkedIn'), exact: true })
    ).toBeVisible();
    await expect(
      dialog.getByText(COPY.confirmDisconnectDescription('LinkedIn'), { exact: true })
    ).toBeVisible();

    // Arm BEFORE confirming — confirming submits the row's native form.
    const postPromise = page.waitForRequest(
      request =>
        request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/self-service/settings'),
      { timeout: 20_000 }
    );
    await dialogConfirmButton(page).click();

    await expect(oauthInterceptedBody(page)).toBeVisible({ timeout: 20_000 });

    const request = await postPromise;
    const postData = request.postData() ?? '';
    // Carried by the hidden field, so the submitter-less form.submit() still
    // includes the unlink pair.
    expect(postData).toContain('unlink=linkedin');
    expect(postData).toMatch(/csrf_token=[^&]+/);

    // G4's core promise: the entire action completed with no OAuth round trip.
    expect(providerHits).toHaveLength(0);

    const marker = await readOutcomeMarker(page);
    expect(marker?.action).toBe('unlink');
    expect(marker?.provider).toBe('linkedin');
  });

  test('CA-31: Cancel closes the dialog, no POST fires, the row stays Connected with its trigger', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const flowState: SettingsFlowRoutingState = { flow: disconnectableFlow() };
    await interceptSettingsFlowReads(page, flowState);
    await mockAuthenticationMethods(page, { methods: ['EMAIL', 'LINKEDIN'] });

    // Collects any settings-flow POST — must stay empty.
    const posts: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/self-service/settings')) {
        posts.push(request.url());
      }
    });

    const securityUrl = await resolveOwnSecurityUrl(page);
    await page.goto(securityUrl);

    await expect(disconnectTrigger(page, 'LinkedIn')).toBeVisible({ timeout: 15_000 });
    await disconnectTrigger(page, 'LinkedIn').click();
    await expect(confirmDialog(page)).toBeVisible();

    await dialogCancelButton(page).click();
    await expect(confirmDialog(page)).toHaveCount(0);

    // preventDefault + pendingDisconnect reset — nothing was submitted.
    expect(posts).toHaveLength(0);
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.connected, { exact: true })).toBeVisible();
    await expect(disconnectTrigger(page, 'LinkedIn')).toBeVisible();
    // No navigation happened.
    await expect(page).toHaveURL(securityUrl);
  });
});
