// spec: workspace#051-cleverbase-account-linking — resumed flows + outcome notices
// Cases: CA-40 (R1-already-held-identity-refused-T027-T028, client contract),
//        CA-42 (E1-privileged-session-reauth, client half),
//        CA-43 (G2/G4 success-notice return legs — the 'linked'/'unlinked'
//               marker outcomes, deterministically automatable client-side).
//
// Persona: space.admin@alkem.io. The Kratos settings-flow READS are mocked
// with crafted flows; GraphQL stays live except where a connected state must
// be synthesized. This exercises the REAL shipped code paths:
// SettingsCrdRoute → securitySettingsResumeTarget → security-tab resume →
// ConnectedAccountsSection's settings-context 4000007 override and
// marker-outcome announcements.
//
// The Kratos-side legs (a second account actually holding the identity,
// password-unchanged proof, the admin-API residency check, a genuinely
// >15-min-old privileged session) stay manual — see the QA plan's manualOnly.

import { expect } from '@playwright/test';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import {
  COPY,
  connectButton,
  disconnectTrigger,
  escapeRegExp,
  passkeyCard,
  passwordCard,
  providerRow,
  resolveOwnProfileUrl,
  sectionCard,
  securitySettingsUrlFrom,
} from './connected-accounts.pages';
import { mockAuthenticationMethods } from './graphql-auth-methods-mock.fixture';
import {
  buildSettingsFlow,
  interceptSettingsFlowReads,
  seedOutcomeMarker,
  SettingsFlowRoutingState,
} from './kratos-settings-mock.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const test = createPersonaTest('space.admin@alkem.io');

const allLinkNodes = [
  { provider: 'microsoft', action: 'link' as const },
  { provider: 'linkedin', action: 'link' as const },
  { provider: 'github', action: 'link' as const },
];

const RAW_KRATOS_4000007_TEXT =
  'RAW-KRATOS-4000007-SENTINEL: an account with the same identifier exists already';

test.describe('Connected Accounts — errored-flow resume and outcome announcements', () => {
  test('CA-40: an errored flow (4000007) on bare /settings resumes on the Security page with the settings-context refusal, exactly once', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const profileUrl = await resolveOwnProfileUrl(page);
    const securityUrl = securitySettingsUrlFrom(profileUrl);
    const securityPath = new URL(securityUrl, baseUrl).pathname;

    // The crafted errored flow: return_to targets the persona's own Security
    // page; `active` left undefined so the section keeps the flow message.
    const flow = buildSettingsFlow({
      returnTo: securityUrl,
      providerNodes: allLinkNodes,
      messages: [{ id: 4000007, type: 'error', text: RAW_KRATOS_4000007_TEXT }],
    });
    const flowState: SettingsFlowRoutingState = { flow };
    await interceptSettingsFlowReads(page, flowState);

    // Exactly where Kratos sends an errored settings flow (its global ui_url).
    await page.goto(`${baseUrl}/settings?flow=${flow.id}`);

    // T027: landed on the owning Security page, NOT bare /settings. Only the
    // path is pinned: the resume target is `<path>?flow=<id>`, but the
    // one-shot cleanup in useUserSecuritySettingsFlow deliberately strips the
    // trailing ?flow once the flow settles, so pinning the query would race it.
    await expect(page).toHaveURL(new RegExp(escapeRegExp(securityPath)), { timeout: 20_000 });

    // T028: the settings-context refusal renders exactly once, page-wide…
    const refusal = page.getByText(COPY.identityAlreadyLinked, { exact: true });
    await expect(refusal).toBeVisible({ timeout: 20_000 });
    await expect(refusal).toHaveCount(1);
    // …the raw Kratos copy lost to the translated override…
    await expect(page.getByText(RAW_KRATOS_4000007_TEXT)).toHaveCount(0);
    // …and nothing echoed into the other cards.
    await expect(passwordCard(page).getByText(/already connected/)).toHaveCount(0);
    await expect(passkeyCard(page).getByText(/already connected/)).toHaveCount(0);

    // The recovery card never rendered on the settled page (asserted after
    // the redirect — the deterministic form of "no 'Set new password'").
    await expect(page.getByRole('heading', { name: 'Set new password' })).toHaveCount(0);

    // Retry offered: nothing changed on either account.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
  });

  test("CA-42: resumed flow + pending marker announces the informational 'Confirm it's you' notice — never a failure", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const securityUrl = securitySettingsUrlFrom(await resolveOwnProfileUrl(page));

    // A message-LESS resumed flow (linkedin still linkable → not connected).
    const flow = buildSettingsFlow({ returnTo: securityUrl, providerNodes: allLinkNodes });
    await interceptSettingsFlowReads(page, { flow });
    // The pending marker exists before app boot — exactly what a real Connect
    // click leaves behind when Kratos interrupts for a privileged-session
    // re-auth and then redirects back with ?flow=<id>.
    await seedOutcomeMarker(page, 'link', 'linkedin');

    await page.goto(`${securityUrl}?flow=${flow.id}`);

    // Info FlowMessage renders role='status' — asserted immediately on ready.
    await expect(
      sectionCard(page).getByRole('status').getByText(COPY.reauthRequiredConnect('LinkedIn'), { exact: true })
    ).toBeVisible({ timeout: 20_000 });
    // The section does NOT announce a failure.
    await expect(page.getByText(COPY.connectFailed('LinkedIn'), { exact: true })).toHaveCount(0);
    // The pending action is re-invokable.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
  });

  test("CA-43: a completed Connect announces the 'LinkedIn connected.' success notice", async ({ page }) => {
    test.setTimeout(60_000);
    const securityUrl = securitySettingsUrlFrom(await resolveOwnProfileUrl(page));

    // Post-redirect reality of a successful link: the flow now offers an
    // UNLINK node for linkedin and the server reports the LINKEDIN method.
    const flow = buildSettingsFlow({
      providerNodes: [
        { provider: 'microsoft', action: 'link' },
        { provider: 'linkedin', action: 'unlink' },
        { provider: 'github', action: 'link' },
      ],
    });
    await interceptSettingsFlowReads(page, { flow });
    await mockAuthenticationMethods(page, { methods: ['EMAIL', 'LINKEDIN'] });
    await seedOutcomeMarker(page, 'link', 'linkedin');

    // No ?flow on the URL: Kratos's success redirect provisions a fresh flow
    // with no flow message, so the marker alone must announce the outcome.
    await page.goto(securityUrl);

    // Success FlowMessage renders role='status', exactly once.
    const notice = page.getByText(COPY.linked('LinkedIn'), { exact: true });
    await expect(sectionCard(page).getByRole('status').getByText(COPY.linked('LinkedIn'), { exact: true })).toBeVisible(
      { timeout: 20_000 }
    );
    await expect(notice).toHaveCount(1);
    // Never announced as an error.
    await expect(sectionCard(page).getByRole('alert')).toHaveCount(0);
    // The row reflects the new truth.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.connected, { exact: true })).toBeVisible();
    await expect(disconnectTrigger(page, 'LinkedIn')).toBeVisible();
  });

  test("CA-43b: a completed Disconnect announces the 'LinkedIn disconnected.' success notice", async ({ page }) => {
    test.setTimeout(60_000);
    const securityUrl = securitySettingsUrlFrom(await resolveOwnProfileUrl(page));

    // Post-redirect reality of a successful unlink: linkedin is linkable
    // again and the server no longer reports the LINKEDIN method.
    const flow = buildSettingsFlow({ providerNodes: allLinkNodes });
    await interceptSettingsFlowReads(page, { flow });
    await mockAuthenticationMethods(page, { methods: ['EMAIL'] });
    await seedOutcomeMarker(page, 'unlink', 'linkedin');

    await page.goto(securityUrl);

    const notice = page.getByText(COPY.unlinked('LinkedIn'), { exact: true });
    await expect(
      sectionCard(page).getByRole('status').getByText(COPY.unlinked('LinkedIn'), { exact: true })
    ).toBeVisible({ timeout: 20_000 });
    await expect(notice).toHaveCount(1);
    await expect(sectionCard(page).getByRole('alert')).toHaveCount(0);
    // The row flipped back to Not connected with Connect re-offered.
    await expect(providerRow(page, 'LinkedIn').getByText(COPY.notConnected, { exact: true })).toBeVisible();
    await expect(connectButton(page, 'LinkedIn')).toBeVisible();
  });
});
